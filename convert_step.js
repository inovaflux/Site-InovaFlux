// Convertisseur STEP -> GLB via occt-import-js (local, sans CDN)
// Usage : node convert_step.js <entree.step> <sortie.glb>
const fs = require('fs');
const path = require('path');

const LIBS = path.join(__dirname, 'libs');
const occtimportjs = require(path.join(LIBS, 'occt-import-js.js'));

const INPUT = process.argv[2];
const OUTPUT = process.argv[3];

if (!INPUT || !OUTPUT) {
    console.error('Usage: node convert_step.js <entree.step> <sortie.glb>');
    process.exit(1);
}

function alignTo4(n) { return Math.ceil(n / 4) * 4; }

(async () => {
    const occt = await occtimportjs({
        locateFile: (name) => path.join(LIBS, name),
    });

    const stepBuf = fs.readFileSync(INPUT);
    console.log('STEP lu :', (stepBuf.length / 1048576).toFixed(1), 'Mo');

    const result = occt.ReadStepFile(new Uint8Array(stepBuf), null);
    if (!result || !result.success) {
        console.error('Échec du décodage STEP');
        process.exit(2);
    }
    const meshes = result.meshes || [];
    console.log('Meshes décodés :', meshes.length);

    const gltf = {
        asset: { version: '2.0', generator: 'occt-import-js step2glb' },
        scenes: [{ nodes: [] }],
        scene: 0,
        nodes: [],
        meshes: [],
        materials: [],
        accessors: [],
        bufferViews: [],
        buffers: [],
    };

    const binChunks = [];
    let byteOffset = 0;

    function pushBufferView(typedArray, target) {
        const buf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        const padded = alignTo4(buf.length);
        const out = Buffer.alloc(padded);
        buf.copy(out);
        binChunks.push(out);
        const view = {
            buffer: 0,
            byteOffset: byteOffset,
            byteLength: buf.length,
        };
        if (target) view.target = target;
        gltf.bufferViews.push(view);
        byteOffset += padded;
        return gltf.bufferViews.length - 1;
    }

    const matCache = new Map();
    function getMaterial(color) {
        const r = color ? color[0] : 0.8;
        const g = color ? color[1] : 0.8;
        const b = color ? color[2] : 0.85;
        const key = `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
        if (matCache.has(key)) return matCache.get(key);
        gltf.materials.push({
            pbrMetallicRoughness: {
                baseColorFactor: [r, g, b, 1],
                metallicFactor: 0.1,
                roughnessFactor: 0.7,
            },
            doubleSided: true,
        });
        const idx = gltf.materials.length - 1;
        matCache.set(key, idx);
        return idx;
    }

    for (const mesh of meshes) {
        const pos = mesh.attributes && mesh.attributes.position ? mesh.attributes.position.array : null;
        const idx = mesh.index ? mesh.index.array : null;
        if (!pos || !idx) continue;

        const positions = Float32Array.from(pos);
        let min = [Infinity, Infinity, Infinity];
        let max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < positions.length; i += 3) {
            for (let k = 0; k < 3; k++) {
                const v = positions[i + k];
                if (v < min[k]) min[k] = v;
                if (v > max[k]) max[k] = v;
            }
        }
        const posView = pushBufferView(positions, 34962);
        gltf.accessors.push({
            bufferView: posView, componentType: 5126, count: positions.length / 3,
            type: 'VEC3', min, max,
        });
        const posAcc = gltf.accessors.length - 1;

        let normAcc = null;
        if (mesh.attributes && mesh.attributes.normal && mesh.attributes.normal.array) {
            const normals = Float32Array.from(mesh.attributes.normal.array);
            const nView = pushBufferView(normals, 34962);
            gltf.accessors.push({
                bufferView: nView, componentType: 5126, count: normals.length / 3, type: 'VEC3',
            });
            normAcc = gltf.accessors.length - 1;
        }

        const indices = Uint32Array.from(idx);
        const idxView = pushBufferView(indices, 34963);
        gltf.accessors.push({
            bufferView: idxView, componentType: 5125, count: indices.length, type: 'SCALAR',
        });
        const idxAcc = gltf.accessors.length - 1;

        const attributes = { POSITION: posAcc };
        if (normAcc !== null) attributes.NORMAL = normAcc;

        const matIdx = getMaterial(mesh.color);
        gltf.meshes.push({
            primitives: [{ attributes, indices: idxAcc, material: matIdx, mode: 4 }],
        });
        const meshIdx = gltf.meshes.length - 1;
        gltf.nodes.push({ mesh: meshIdx, name: mesh.name || ('mesh' + meshIdx) });
        gltf.scenes[0].nodes.push(gltf.nodes.length - 1);
    }

    const binBuffer = Buffer.concat(binChunks);
    gltf.buffers.push({ byteLength: binBuffer.length });

    let jsonStr = JSON.stringify(gltf);
    const jsonBuf = Buffer.from(jsonStr, 'utf8');
    const jsonPad = alignTo4(jsonBuf.length) - jsonBuf.length;
    const jsonPadded = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

    const binPad = alignTo4(binBuffer.length) - binBuffer.length;
    const binPadded = Buffer.concat([binBuffer, Buffer.alloc(binPad, 0)]);

    const totalLen = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0); // glTF
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(totalLen, 8);

    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonPadded.length, 0);
    jsonHeader.writeUInt32LE(0x4e4f534a, 4); // JSON

    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binPadded.length, 0);
    binHeader.writeUInt32LE(0x004e4942, 4); // BIN

    const glb = Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]);
    fs.writeFileSync(OUTPUT, glb);
    console.log('GLB écrit :', OUTPUT, '(' + (glb.length / 1048576).toFixed(2) + ' Mo)');
    console.log('Noeuds :', gltf.nodes.length, '| Matériaux :', gltf.materials.length);
})();
