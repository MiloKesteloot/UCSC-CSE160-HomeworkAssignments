let ctx;

// function main() {
//
//     let canvas = document.getElementById('example');
//     if (!canvas) {
//         console.log('Failed to retrieve the <canvas> element');
//         return false;
//     }
//
//     ctx = canvas.getContext('2d');
// }

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
    document.getElementById('shape-size').addEventListener('mouseup', function() { g_selectedSize = this.value});
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

function drawShapes() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let len = g_points.length;
    for(let i = 0; i < len; i++) {
        let p = g_points[i];

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

function sendTextToHTML(text, ID) {
    let htmlElm = document.getElementById(ID);
    htmlElm.innerHTML = text;
}

let g_points = [];
let g_selectedColor = [1, 1, 1, 1];
let g_selectedSize = 5;

let clicking = false;

function click(event) {
    clicking = true;
    paint(event);
}

function upClick(event) {
    clicking = false;
}

function move(event) {
    if (clicking) paint(event);
}

function paint(event) {
    let [x, y] = convertToGL(event.clientX, event.clientY, event.target.getBoundingClientRect());

    let point = new Point([x, y], g_selectedColor, g_selectedSize);
    g_points.push(point);

    drawShapes();
}
