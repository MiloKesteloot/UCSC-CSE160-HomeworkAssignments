class Shape {
    constructor(x, z, y, sx, sz, sy, px, pz, py, r, ax, az, ay) {
        this.type='cube';
        this.color = [0.2, 0.2, 0.2, 1];
        this.matrix = new Matrix4();
        this.nonScaleMatrix = new Matrix4(this.matrix);
        this.parent = null;
        this.children = [];

        this.faceCamera = false;

        this.position = [x, y, z];
        this.scale = [sx, sy, sz];
        if (px) {
            this.pivot = [px, py, pz];
            this.rotation = [r, ax, ay, az];
        } else {
            this.pivot = undefined;
            this.rotation = undefined;
        }

        this.uvCoords = {};

        this.transparent = false;

        this.texture = null;

        this.buildMatrix();
    }

    getTexture() {
        if (this.texture !== null) {
            return this.texture;
        }

        if (this.parent === null) {
            return null;
            console.error('Furthest parent had no texture!');
        }

        return this.parent.getTexture();
    }

    setTexture(name) {
        this.texture = name;
    }

    buildMatrix() {
        this.matrix.setIdentity();

        if (this.pivot !== undefined && this.pivot[0] !== undefined) {

            this.matrix.translate(this.pivot[0], this.pivot[1], this.pivot[2]);

            this.matrix.rotate(eval(this.rotation[0]), this.rotation[1], this.rotation[2], this.rotation[3]);

            this.matrix.translate(-this.pivot[0], -this.pivot[1], -this.pivot[2]);
        }

        this.matrix.translate(this.position[0], this.position[1], this.position[2]);

        if (this.faceCamera) {
            const cameraMat = new Matrix4().rotate(player.rot.pitch, 1, 0, 0).rotate(player.rot.yaw, 0, 1, 0);
            cameraMat.setInverseOf(cameraMat);
            this.matrix.multiply(cameraMat);
            this.matrix.rotate(90, 1, 0, 0);
        }

        this.nonScaleMatrix = new Matrix4(this.matrix);

        this.matrix.scale(this.scale[0], this.scale[1], this.scale[2]);
    }

    getNonScaleMatrixTrain() {
        if (this.parent === null) {
            return new Matrix4(this.nonScaleMatrix);
        }

        return this.parent.getNonScaleMatrixTrain().multiply(this.nonScaleMatrix);
    }

    getPositionTrain() {
        if (this.parent === null) {
            return this.position;
        }

        const p = this.parent.getPositionTrain();
        return [this.position[0] + p[0], this.position[1] + p[1], this.position[2] + p[2]];
    }

    add(child) {
        child.parent = this;

        const parentPos = this.getPositionTrain();
        child.position[0] -= parentPos[0];
        child.position[1] -= parentPos[1];
        child.position[2] -= parentPos[2];
        if (child.pivot !== undefined && child.pivot[0] !== undefined) {
            child.pivot[0] -= parentPos[0];
            child.pivot[1] -= parentPos[1];
            child.pivot[2] -= parentPos[2];
        }

        child.buildMatrix();

        this.children.push(child);
        return child;
    }

    col(r, g, b, a) {
        this.color = [r/255.0, g/255.0, b/255.0, a/255.0];
        return this;
    }

    getWorldMatrix(parentMatrix = null) {
        let worldMatrix = new Matrix4();

        if (parentMatrix) {
            worldMatrix.set(parentMatrix);
            worldMatrix.multiply(this.matrix);
        } else {
            worldMatrix.set(this.matrix);
        }

        return worldMatrix;
    }

    render(parentMatrix = null) {
        const worldMatrix = this.getWorldMatrix(parentMatrix);
        gl.uniformMatrix4fv(u_ModelMatrix, false, worldMatrix.elements);

        const normalMatrix = this.getNonScaleMatrixTrain();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        this.subRender(new Matrix4(worldMatrix));

        for (const key in this.children) {
            this.children[key].render(this.getNonScaleMatrixTrain());
        }
    }

    subRender() {
        console.error("subRender() has not yet been set up yet on:");
        console.error(this);
    }

    static multColor(rgba, m) {
        return [rgba[0]*m, rgba[1]*m, rgba[2]*m, rgba[3]];
    }

    applyTexture(faces, uv, rotations) {
        // [x1, y1, x2, y2]

        let image = textures[this.getTexture()].image;

        let x1 = uv[0]/image.width;
        let y1 = uv[1]/image.height;
        let x2 = (uv[0]+uv[2])/image.width;
        let y2 = (uv[1]+uv[3])/image.height;

        const m = 0.0004;
        if (x1 < x2) {
            x1 += m;
            x2 -= m;
        } else {
            x1 -= m;
            x2 += m;
        }
        if (y1 < y2) {
            y1 += m;
            y2 -= m;
        } else {
            y1 -= m;
            y2 += m;
        }

        let x1y1 = [x1, y1];
        let x2y1 = [x2, y1];
        let x1y2 = [x1, y2];
        let x2y2 = [x2, y2];

        function rotate() {
            let x1y1s = x1y1;
            x1y1 = x2y1;
            x2y1 = x2y2;
            x2y2 = x1y2;
            x1y2 = x1y1s;
        }

        for (let i = 0; i < rotations; i++) {
            rotate();
        }

        uv = [...x1y1,   ...x2y2,   ...x2y1,    ...x1y1,   ...x1y2,   ...x2y2];

        this.useTexture = true;
        if (faces === "all") {
            faces = ["top", "bottom", "right", "left", "front", "back"];
        }
        if (!Array.isArray(faces)) faces = [faces];
        for (let f of faces) {
            this.uvCoords[f] = uv;
        }
        return this;
    }
}

class Sphere extends Shape {
    subRender(worldMatrix) {
        Sphere.drawSphere(worldMatrix, this.color, this.getTexture(), this.uvCoords);
    }

    static drawSphere(matrix, rgba, texture, uv) {
        gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
        gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements);

        const d = Math.PI/25;
        const dd = Math.PI/25;

        const sin = Math.sin;
        const cos = Math.cos;

        for (let t = 0; t < Math.PI; t += d) {
            for (let r = 0; r < 2*Math.PI; r += d) {
                const p1 = [sin(t) * cos(r), sin(t)*sin(r), cos(t)];
                const p2 = [sin(t+dd) * cos(r), sin(t+dd)*sin(r), cos(t+dd)];
                const p3 = [sin(t) * cos(r+dd), sin(t)*sin(r+dd), cos(t)];
                const p4 = [sin(t+dd) * cos(r+dd), sin(t+dd) * sin(r+dd), cos(t+dd)];
                // const p1 = [sin(t) * cos(r), cos(t), sin(t)*sin(r)];
                // const p2 = [sin(t+dd) * cos(r), cos(t+dd), sin(t+dd)*sin(r)];
                // const p3 = [sin(t) * cos(r+dd), cos(t), sin(t)*sin(r+dd)];
                // const p4 = [sin(t+dd) * cos(r+dd), cos(t+dd), sin(t+dd) * sin(r+dd)];

                let v = [];
                let uv = [];
                v = v.concat(p1); uv = uv.concat([0, 0]);
                v = v.concat(p2); uv = uv.concat([0, 0]);
                v = v.concat(p4); uv = uv.concat([0, 0]);

                Triangle3D.draw(
                    v, rgba, texture, uv, flipEveryXY(v)
                );

                v = [];
                uv = [];
                v = v.concat(p1); uv = uv.concat([0, 0]);
                v = v.concat(p4); uv = uv.concat([0, 0]);
                v = v.concat(p3); uv = uv.concat([0, 0]);

                Triangle3D.draw(
                    v, rgba, texture, uv, flipEveryXY(v)
                );
            }
        }

        // // Default is top
        // Triangle3D.draw(
        //     [0,1,1, 1,1,0, 0,1,0], col, t, uv ? uv.slice(0,6) : null,
        //     [0,1,0, 0,1,0, 0,1,0]
        // );
    }
}

function flipEveryXY(vn) {
    const v = [];
    for (let i = 0; i < vn.length; i++) {
        v.push(vn[i]);
    }
    for (let i = 0; i < v.length/3; i++) {
        const o = i*3;
        const s1 = v[o];
        const s2 = v[o+2];
        v[o] = s2;
        v[o+2] = s1;
    }
    return v;
}

class Cube extends Shape {
    subRender(worldMatrix) {
        Cube.drawCube(worldMatrix, this.color, this.getTexture(), this.uvCoords);
    }

    static drawCube(matrix, rgba, t, uv) {
        const col1 = rgba;
        const col2 = this.multColor(rgba, 0.85);
        const col3 = this.multColor(rgba, 0.7);
        const col4 = this.multColor(rgba, 0.55);
        const col5 = this.multColor(rgba, 0.4);
        const col6 = this.multColor(rgba, 0.35);

        // Top
        Cube.drawFace(col1, uv.top, matrix, t, [], [0, 1, 0]);
        // Bottom
        Cube.drawFace(col2, uv.bottom, matrix, t, [[180, 0, 0, 1], [180, 0, 1, 0]], [0, -1, 0]);
        // Front
        Cube.drawFace(col3, uv.front, matrix, t, [[90, 0, 0, 1]], [0, 0, -1]);
        // Back
        Cube.drawFace(col4, uv.back, matrix, t, [[-90, 0, 0, 1], [180, 0, 1, 0]], [0, 0, 1]);
        // Right
        Cube.drawFace(col5, uv.right, matrix, t, [[90, 1, 0, 0]], [1, 0, 0]);
        // Left
        Cube.drawFace(col6, uv.left, matrix, t, [[-90, 1, 0, 0]], [-1, 0, 0]);
    }

    static drawFace(col, uv, m, texture, rotations, normal) {

        m = new Matrix4(m);

        for (let r of rotations) {
            m.rotate(r[0], r[1], r[2], r[3]);
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);
        // gl.uniformMatrix4fv(u_NormalMatrix, false, m.elements);
        gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements);

        normal = [...normal, ...normal, ...normal];

        // Default is top
        Triangle3D.draw(
            [0,1,1, 1,1,0, 0,1,0], col, texture, uv ? uv.slice(0,6) : null,
            normal
        );
        Triangle3D.draw(
            [0,1,1, 1,1,1, 1,1,0], col, texture, uv ? uv.slice(6,12) : null,
            normal
        );
    }
}

class Plane extends Shape {
    subRender() {
        let rgba = this.color;
        const col4 = Shape.multColor(rgba, 0.55);
        Triangle3D.draw(
            [0,0.5,1, 1,0.5,0, 0,0.5,0], col4, this.getTexture(), this.uvCoords.top ? this.uvCoords.top.slice(0,6) : null,
            [0,1,0,   0,1,0,   0,1,0]
        );
        Triangle3D.draw(
            [0,0.5,1, 1,0.5,1, 1,0.5,0], col4, this.getTexture(), this.uvCoords.top ? this.uvCoords.top.slice(6,12) : null,
            [0,1,0,   0,1,0,   0,1,0]
        );
    }
}

class Particle extends Plane {
    subRender() {
        super.subRender();
    }
}

let savedModels = {};

class Model extends Shape {
    constructor(filePath, x, z, y, sx, sz, sy, px, pz, py, r, ax, az, ay) {
        super(x, z, y, sx, sz, sy, px, pz, py, r, ax, az, ay);
        this.type = 'model';
        this.isFullyLoaded = false;
        this.modelData = null;

        this.vertexBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();

        if (savedModels[filePath] === undefined) {
            this._loadModel(filePath);
        } else {
            this.isFullyLoaded = true;
            this.modelData = savedModels[filePath];
            // _parseModel(filePath, fileContent)
        }
    }

    async _loadModel(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Could not load "${filePath}"`);
            this._parseModel(filePath, await response.text());
        } catch (e) {
            console.error('ModelShape: Failed to load model.', e);
        }
    }

    _parseModel(filePath, fileContent) {
        const lines = fileContent.split('\n');
        const allVertices = [];
        const allNormals = [];
        const unpackedVerts = [];
        const unpackedNormals = [];

        for (const line of lines) {
            const tokens = line.trim().split(/\s+/);
            switch (tokens[0]) {
                case 'v':
                    allVertices.push(
                        parseFloat(tokens[1]),
                        parseFloat(tokens[2]),
                        parseFloat(tokens[3])
                    );
                    break;
                case 'vn':
                    allNormals.push(
                        parseFloat(tokens[1]),
                        parseFloat(tokens[2]),
                        parseFloat(tokens[3])
                    );
                    break;
                case 'f':
                    for (const face of [tokens[1], tokens[2], tokens[3]]) {
                        const indices = face.split('//');
                        const vi = (parseInt(indices[0]) - 1) * 3;
                        const ni = (parseInt(indices[1]) - 1) * 3;
                        unpackedVerts.push(
                            allVertices[vi], allVertices[vi+1], allVertices[vi+2]
                        );
                        unpackedNormals.push(
                            allNormals[ni], allNormals[ni+1], allNormals[ni+2]
                        );
                    }
                    break;
            }
        }

        savedModels[filePath] = {
            vertices: new Float32Array(unpackedVerts),
            normals:  new Float32Array(unpackedNormals),
        };
        this.isFullyLoaded = true;
    }

    subRender(worldMatrix) {
        if (!this.isFullyLoaded) return;

        gl.uniformMatrix4fv(u_ModelMatrix, false, worldMatrix.elements);

        const normalMatrix = new Matrix4().setInverseOf(worldMatrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        gl.uniform1i(u_UseTexture, -1);
        gl.uniform4f(u_FragColor, ...this.color);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.vertices, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.modelData.normals, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        gl.drawArrays(gl.TRIANGLES, 0, this.modelData.vertices.length / 3);
    }
}

class Triangle3D {
    constructor(corners, rgb = [1, 0.5, 0.5, 1]) {
        this.type = "triangle";
        this.corners = [...corners];
        this.color = [...rgb, 1];
    }

    // Claude gave me the idea for this reused vertex buffer
    static vertexBuffer = null;
    static uvBuffer = null;
    static normalBuffer = null;

    static initBuffer() {
        if (Triangle3D.vertexBuffer && Triangle3D.uvBuffer) return true;

        Triangle3D.vertexBuffer = gl.createBuffer();
        if (!Triangle3D.vertexBuffer) {
            console.error('Failed to create the vertex buffer object');
            return false;
        }

        Triangle3D.uvBuffer = gl.createBuffer();
        if (!Triangle3D.uvBuffer) {
            console.error('Failed to create the UV buffer object');
            return false;
        }

        Triangle3D.normalBuffer = gl.createBuffer();
        if (!Triangle3D.normalBuffer) {
            console.error('Failed to create the normal buffer object');
            return false;
        }

        return true;
    }

    render() {
        Triangle3D.draw(this.corners, this.color);
    }

    static draw(corners, color, texture = null, uvCoords = null, normals = null) {

        if (!Triangle3D.initBuffer()) return;

        // uvCoords = [0, 0, 1, 1, 0, 1];
        const m = 1;
        // uvCoords = [0, 0, 0, m, m, m];

        if (texture !== null && uvCoords !== null) {

            color = [1, 1, 1, 1];

            // gl.activeTexture(gl.TEXTURE0);
            // gl.bindTexture(gl.TEXTURE_2D, texture);
            // gl.uniform1i(u_Sampler1, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, Triangle3D.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvCoords), gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(a_UV);

            gl.uniform1i(u_UseTexture, textures[texture].id);
        } else {
            gl.uniform1i(u_UseTexture, -1);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, Triangle3D.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        corners = corners.map(x => x - 0.5);

        var n = corners.length/3; // The number of vertices

        gl.bindBuffer(gl.ARRAY_BUFFER, Triangle3D.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(a_Position);

        gl.uniform4f(u_FragColor, ...color);

        gl.drawArrays(gl.TRIANGLES, 0, n);
    }
}
