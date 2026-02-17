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
        this.pivot = [px, py, pz];
        this.rotation = [r, ax, ay, az];

        this.uvCoords = {};

        this.transparent = false;

        this.buildMatrix();
    }

    buildMatrix() {
        this.matrix.setIdentity();

        if (this.pivot[0] !== undefined) {

            // 1. move to pivot
            this.matrix.translate(this.pivot[0], this.pivot[1], this.pivot[2]);

            // 2. rotate around pivot
            this.matrix.rotate(eval(this.rotation[0]), this.rotation[1], this.rotation[2], this.rotation[3]);

            // 3. move back from pivot
            this.matrix.translate(-this.pivot[0], -this.pivot[1], -this.pivot[2]);
        }

        this.matrix.translate(this.position[0], this.position[1], this.position[2]);

        if (this.faceCamera) {
            const cameraMat = new Matrix4().rotate(g_globalPitchAngle, 1, 0, 0).rotate(g_globalYawAngle, 0, 1, 0);
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
        if (child.pivot[0] !== undefined) {
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

class Cube extends Shape {
    subRender(worldMatrix) {
        Cube.drawCube(worldMatrix, this.color, this.uvCoords);
    }

    static drawCube(matrix, rgba, uv) {
        const col1 = rgba;
        const col2 = this.multColor(rgba, 0.85);
        const col3 = this.multColor(rgba, 0.7);
        const col4 = this.multColor(rgba, 0.55);
        const col5 = this.multColor(rgba, 0.4);
        const col6 = this.multColor(rgba, 0.35);

        // Top
        Cube.drawFace(col1, uv.top, matrix, []);
        // Bottom
        Cube.drawFace(col2, uv.bottom, matrix, [[180, 0, 0, 1], [180, 0, 1, 0]]);
        // Front
        Cube.drawFace(col3, uv.front, matrix, [[90, 0, 0, 1]]);
        // Back
        Cube.drawFace(col4, uv.back, matrix, [[-90, 0, 0, 1], [180, 0, 1, 0]]);
        // Right
        Cube.drawFace(col5, uv.right, matrix, [[90, 1, 0, 0]]);
        // Left
        Cube.drawFace(col6, uv.left, matrix, [[-90, 1, 0, 0]]);
    }

    static drawFace(col, uv, m, rotations) {

        m = new Matrix4(m);

        for (let r of rotations) {
            m.rotate(r[0], r[1], r[2], r[3]);
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);

        // Default is top
        Triangle3D.draw([0,1,1, 1,1,0, 0,1,0], col, uv ? uv.slice(0,6) : null);
        Triangle3D.draw([0,1,1, 1,1,1, 1,1,0], col, uv ? uv.slice(6,12) : null);

    }
}

class Plane extends Shape {
    subRender() {
        let rgba = this.color;
        const col4 = Shape.multColor(rgba, 0.55);
        Triangle3D.draw([0,0.5,1, 1,0.5,0, 0,0.5,0], col4, this.uvCoords.top ? this.uvCoords.top.slice(0,6) : null);
        Triangle3D.draw([0,0.5,1, 1,0.5,1, 1,0.5,0], col4, this.uvCoords.top ? this.uvCoords.top.slice(6,12) : null);
    }
}

class Particle extends Plane {
    subRender() {
        super.subRender();
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

    static initBuffer() {
        if (Triangle3D.vertexBuffer && Triangle3D.uvBuffer) return true;

        Triangle3D.vertexBuffer = gl.createBuffer();
        if (!Triangle3D.vertexBuffer) {
            console.error('Failed to create the buffer object');
            return false;
        }

        Triangle3D.uvBuffer = gl.createBuffer();
        if (!Triangle3D.uvBuffer) {
            console.error('Failed to create the UV buffer object');
            return false;
        }
        
        return true;
    }

    render() {
        Triangle3D.draw(this.corners, this.color);
    }

    static draw(corners, color, uvCoords = null) {

        if (!Triangle3D.initBuffer()) return;

        // uvCoords = [0, 0, 1, 1, 0, 1];
        const m = 1;
        // uvCoords = [0, 0, 0, m, m, m];

        if (uvCoords !== null) {

            color = [1, 1, 1, 1];

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(u_Sampler, 0);
            
            // Bind and set UV data
            gl.bindBuffer(gl.ARRAY_BUFFER, Triangle3D.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvCoords), gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(a_TexCoord);
            
            // Tell shader to use texture
            gl.uniform1i(u_UseTexture, 1);
        } else {
            gl.uniform1i(u_UseTexture, 0);
        }

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
