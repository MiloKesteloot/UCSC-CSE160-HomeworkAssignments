let ctx;

// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
let VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute float a_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = a_Size;
}`;

// Fragment shader program
let FSHADER_SOURCE =`
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

let canvas;
let gl;
let a_Position;
let a_Size;
let u_FragColor;

function setUpWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
}

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    a_Size = gl.getAttribLocation(gl.program, 'a_Size');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Size');
        return;
    }

    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
}

function setUpElements() {
    document.getElementById('red').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/255});
    document.getElementById('green').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/255});
    document.getElementById('blue').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/255});
    document.getElementById('segment-count').addEventListener('mouseup', function() { g_segmentCount = this.value});

}

function main() {

    setUpWebGL();

    connectVariablesToGLSL();

    setUpElements();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmouseup = upClick;
    canvas.onmousemove = move;

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawArtwork();
}

function convertToGL(x, y, rect) {
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return [x, y];
}

function clearCanvas() {
    g_points = [];
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function drawArtwork() {
    col = [210/355, 180/355, 140/355, 1];
    addTri(0, 0, 2, 0, 3, 3);
    addTri(2, 0, 3, 1, 3, 3);
    addTri(3, 3, 5, 3, 5, 1);
    addTri(3, 1, 3, 3, 5, 1);
    col = [0.03, 0.8, 0.1, 1];
    addTri(3.5, 0, 4.5, 0, 4.5, 1);
    addTri(3.5, 0, 4.5, 1, 3.5, 1);
    addTri(3.5, 1, 4, 1, 4, 2.5);
    addTri(3.5, 1, 3.5, 2.5, 4, 2.5);
    addTri(3.5, 3, 3.5, 6, 4.5, 6);
    addTri(3.5, 3, 4.5, 3, 4.5, 6);
    col = [0.03, 0.4, 0.1, 1];
    addTri(4.5, 5.5, 5.5, 5.5, 4.5, 4.5)
    addTri(4.5, 3.5, 5.5, 3.5, 4.5, 4.5)
    col = [0.9, 0.1, 0.2, 1];
    addTri(1, 8, 2, 9, 3, 8);
    addTri(3, 8, 4, 9, 5, 8);
    addTri(5, 8, 6, 9, 7, 8);
    addTri(1, 8, 3, 8, 3, 6);
    addTri(3, 8, 7, 8, 5, 6);
    addTri(3, 8, 5, 6, 3, 6);
}

let col = [0, 0, 0, 1];

function l(v) {
    v/=5;
    v-=1;
    return v;
}

function addTri(x1, y1, x2, y2, x3, y3) {
    x1 = l(x1);
    y1 = l(y1);
    x2 = l(x2);
    y2 = l(y2);
    x3 = l(x3);
    y3 = l(y3);
    g_points.push(new Triangle([x1, y1, x2, y2, x3, y3], col));
    drawShapes();
}

function drawShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let len = g_points.length;
    for(let i = 0; i < len; i++) {
        let p = g_points[i];
        p.render();
    }

    for(let i = 0; i < demoTris.length; i++) {
        let p = demoTris[i];
        p.render();
    }
}

class Point {
    constructor(pos, rgb, s) {
        this.type = "point";
        this.pos = [...pos];
        this.color = [...rgb, 1];
        this.size = s;
    }

    render() {
        // Pass the position of a point to a_Position variable
        gl.vertexAttrib3f(a_Position, ...this.pos, 0.0);
        // Pass the position of a point to a_Position variable
        gl.vertexAttrib1f(a_Size, this.size);
        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, ...this.color);
        // Draw
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

class Triangle {
    constructor(corners, rgb) {
        this.type = "triangle";
        this.corners = [...corners];
        this.color = [...rgb, 1];
    }

    render() {
        var n = this.corners.length/2; // The number of vertices

        // Create a buffer object
        var vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) {
            console.log('Failed to create the buffer object');
            return -1;
        }

        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        // Write date into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.corners), gl.STATIC_DRAW);

        // Assign the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);

        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, ...this.color);

        gl.drawArrays(gl.TRIANGLES, 0, n);
    }
}

function sendTextToHTML(text, ID) {
    let htmlElm = document.getElementById(ID);
    htmlElm.innerHTML = text;
}

let g_points = [];
let g_selectedColor = [1, 1, 1, 1];
let g_selectedSize = 20;
let g_segmentCount = 8
let g_mode = "circle";

function drawSquares() {
    g_mode = "square";
}

function drawCircles() {
    g_mode = "circle";
}

function drawTriangles() {
    g_mode = "triangle";
}

let clicking = false;
let clickCenter = null;

let demoTris = [];

function getDraggedArt(event) {
    let [x, y] = convertToGL(event.clientX, event.clientY, event.target.getBoundingClientRect());
    let size = (new Vector3([x, y, 0])).sub(clickCenter).magnitude();

    let sides = g_segmentCount;

    let edge = new Vector3([0, 1, 0]);

    if (g_mode === "square") {
        sides = "4";
    }

    if (g_mode === "triangle") {
        sides = 3;
    }

    if (sides === "4") {
        edge.rot(3.1415/4);
    }

    if (sides === "20") {
        sides = 100;
    }

    edge.mul(size);

    x = clickCenter.elements[0];
    y = clickCenter.elements[1];

    demoTris = [];

    for (let i = 0; i < sides; i++) {
        let lastEdge = new Vector3([edge.elements[0], edge.elements[1], 0]);
        edge.rot(3.1415*2/sides);
        let point = new Triangle([edge.elements[0]+x, edge.elements[1]+y, 0+x, 0+y, lastEdge.elements[0]+x, lastEdge.elements[1]+y], g_selectedColor, g_selectedSize);
        demoTris.push(point);
    }

    drawShapes();
}

function click(event) {
    clicking = true;
    let [x, y] = convertToGL(event.clientX, event.clientY, event.target.getBoundingClientRect());
    clickCenter = new Vector3([x, y, 0]);
}

function upClick(event) {
    clicking = false;
    for (let dt of demoTris) {
        g_points.push(dt);
    }
    demoTris = [];
    drawShapes();
}

function move(event) {
    if (clicking) getDraggedArt(event)

}

function paint(x, y) {


    drawShapes();
}
