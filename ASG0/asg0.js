// DrawTriangle.js (c) 2012 matsuda

let ctx;
let canvasWidth;
let canvasHeight;
let xInput1;
let yInput1;
let xInput2;
let yInput2;
let operationInput;
let scalarInput;


function drawVector(v, color) {
    ctx.beginPath();
    ctx.moveTo(canvasWidth/2, canvasHeight/2);
    ctx.lineTo(v.elements[0]*20+canvasWidth/2, -v.elements[1]*20+canvasHeight/2);
    ctx.strokeStyle = color;
    ctx.stroke();
}

function handleDrawEvent() {
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const v1 = new Vector3([xInput1.value, yInput1.value, 0]);
    drawVector(v1, "red");

    const v2 = new Vector3([xInput2.value, yInput2.value, 0]);
    drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
    handleDrawEvent();

    const v1 = new Vector3([xInput1.value, yInput1.value, 0]);
    const v2 = new Vector3([xInput2.value, yInput2.value, 0]);

    const op = operationInput.value;
    const scalar = scalarInput.value;

    if (op === "add") {
        drawVector(v1.add(v2), "green");
    } else if (op === "sub") {
        drawVector(v1.sub(v2), "green");
    } else if (op === "mul") {
        drawVector(v1.mul(scalar), "green");
        drawVector(v2.mul(scalar), "green");
    } else if (op === "div") {
        drawVector(v1.div(scalar), "green");
        drawVector(v2.div(scalar), "green");
    } else if (op === "norm") {
        drawVector(v1.div(v1.magnitude()), "green");
        drawVector(v2.div(v2.magnitude()), "green");
    } else if (op === "mag") {
        console.log("Magnitude v1: " + v1.magnitude());
        console.log("Magnitude v2: " + v2.magnitude());
    } else if (op === "ang") {
        const angle = Math.acos(Vector3.dot(v1, v2) / v1.magnitude() / v2.magnitude()) * 180 / Math.PI;
        console.log("Angle: " + angle);
    } else if (op === "area") {
        console.log("Area of the triangle: " + Vector3.cross(v1, v2).magnitude()/2);
    }
}

function areaTriangle(v1, v2) {

}

function main() {  
    // Retrieve <canvas> element
    let canvas = document.getElementById('example');
    if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
    }

    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    ctx = canvas.getContext('2d');
    xInput1 = document.getElementById('xInput1');
    yInput1 = document.getElementById('yInput1');
    xInput2 = document.getElementById('xInput2');
    yInput2 = document.getElementById('yInput2');
    operationInput = document.getElementById('operationInput');
    scalarInput = document.getElementById('scalarInput');

    handleDrawEvent();
}
