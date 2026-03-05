let ctx;

// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
let VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;

attribute vec2 a_UV;
varying vec2 v_UV;

attribute vec3 a_Normal;
varying vec3 v_Normal;
varying vec4 v_Position;

void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    // v_Normal = (u_ModelMatrix * vec4(a_Normal, 1)).rgb;
    // v_Normal = normalize(mat3(transpose(inverse(u_ModelMatrix))) * a_Normal);
    v_Normal = normalize(mat3(u_NormalMatrix) * a_Normal);
    v_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
}`;

// TODO Remove if for using texture vs color once they all use texture
// Fragment shader program
let FSHADER_SOURCE =`
precision mediump float;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform int u_UseTexture;
uniform vec3 u_LightPos;
varying vec2 v_UV;
varying vec3 v_Normal;
uniform vec3 u_CameraPos;
varying vec4 v_Position;
uniform bool u_LightOn;
uniform bool u_NormalsOn;

uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;

void main() {
    vec4 color;
    // color = vec4(1.0, 0.0, 0.0, 1.0);
    vec4 UVColor = vec4(1.0, 1.0, 1.0, 1.0);
    if (u_UseTexture == 0) {
        UVColor = texture2D(u_Sampler0, v_UV);
        color = vec4(1.0, 0.0, 0.0, 1.0);
    }
    if (u_UseTexture == 1) {
        UVColor = texture2D(u_Sampler1, v_UV);
        color = vec4(1.0, 0.0, 0.0, 1.0);
    }
    color = UVColor * u_FragColor;
    if (color.a < 0.1) {
        discard;
        return;
    }
    gl_FragColor = color;

    vec3 v_Normal2 = v_Normal.zyx; // Flip because of flipped stuff for blender in Shapes.js

    vec3 toCamera = u_CameraPos - vec3(v_Position);
    float cr = length(toCamera);

    // if (cr < 2.0) {
    //     gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    //     return;
    // }

    vec3 toLight = vec3(
    u_LightPos.x,
    u_LightPos.y,
    u_LightPos.z
    ) - vec3(v_Position);
    float r = length(toLight);

    vec3 L = normalize(toLight);
    vec3 N = normalize(v_Normal2);
    float nDotL = max(dot(N,L), 0.0);

    // Reflection
    vec3 R = reflect(-L, N);

    // Eye
    vec3 E = normalize(u_CameraPos-vec3(v_Position));

    // Specular
    float specular = pow(max(dot(E, R), 0.0), 10.0);

    vec3 diffuse = vec3(gl_FragColor) * nDotL;
    vec3 ambient = vec3(gl_FragColor) * 0.3;

    if (u_LightOn) {
        gl_FragColor = vec4(diffuse + ambient + specular, 1.0);

        vec3 toSpot = normalize(vec3(v_Position) - u_SpotPos);
        float spotAngle = dot(toSpot, normalize(u_SpotDir));
        if (spotAngle > 0.9) {
            float spotNDotL = max(dot(N, -toSpot), 0.0);
            vec3 spotDiffuse = vec3(color) * spotNDotL;
            gl_FragColor.rgb += spotDiffuse;
        }
    }

    if (u_NormalsOn) {
        gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
    }
    // gl_FragColor = vec4(v_Normal, 1.0);
}
`;

function setUpWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = canvas.getContext("webgl"); // , {preserveDrawingBuffer: true}
    if (!gl) {
        console.error('Failed to get the rendering context for WebGL');
        return;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
}

function getAttribLocation(program, name) {
    let attrib = gl.getAttribLocation(program, name);
    if (attrib < 0) {
        console.error('Failed to get the storage location of ' + name);
        return null;
    }
    return attrib;
}

function getUniformLocation(program, name) {
    let uniform = gl.getUniformLocation(program, name);
    if (!uniform) {
        console.error('Failed to get the storage location of ' + name);
        return null;
    }
    return uniform;
}

let texture;
let textures = {};

let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_Sampler0;
let u_Sampler1;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_UseTexture;
let u_LightPos;
let u_SpotPos;
let u_SpotDir;
let u_CameraPos;
let u_NormalMatrix;
let u_LightOn;
let u_NormalsOn;

const samplerGLInfo = [];

let imagesToLoad = 0;

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.error('Failed to initialize shaders.');
        return;
    }

    a_Position = getAttribLocation(gl.program, 'a_Position');
    a_UV = getAttribLocation(gl.program, 'a_UV');
    a_Normal = getAttribLocation(gl.program, 'a_Normal');

    u_FragColor = getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotateMatrix = getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    u_ViewMatrix = getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjectionMatrix = getUniformLocation(gl.program, 'u_ProjectionMatrix');
    u_Sampler0 = getUniformLocation(gl.program, 'u_Sampler0');
    u_Sampler1 = getUniformLocation(gl.program, 'u_Sampler1');
    u_UseTexture = getUniformLocation(gl.program, 'u_UseTexture');
    u_LightPos = getUniformLocation(gl.program, 'u_LightPos');
    u_SpotPos = getUniformLocation(gl.program, 'u_SpotPos');
    u_SpotDir = getUniformLocation(gl.program, 'u_SpotDir');
    u_CameraPos = getUniformLocation(gl.program, 'u_CameraPos');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_LightOn = getUniformLocation(gl.program, 'u_LightOn');
    u_NormalsOn = getUniformLocation(gl.program, 'u_NormalsOn');

    let identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, identityM.elements);

    return !!(a_Position >= 0 &&
        a_UV >= 0 &&
        a_Normal >= 0 &&
        u_FragColor &&
        u_Sampler0 &&
        u_Sampler1 &&
        u_ModelMatrix &&
        u_GlobalRotateMatrix &&
        u_ViewMatrix &&
        u_ProjectionMatrix &&
        u_UseTexture &&
        u_LightPos &&
        u_SpotPos &&
        u_SpotDir &&
        u_CameraPos &&
        u_LightOn &&
        u_NormalsOn);
}

let fpsElement;
let pauseButton;
let paused = false;

let toggleLightButton;
let toggleNormalsButton;

function setUpElements() {
    fpsElement = document.getElementById("fps");
    pauseButton = document.getElementById("pauseButton");
    document.getElementById('neckYawAngleSlide').addEventListener('input', function() {g_neckYawAngle = -this.value;})
    document.getElementById('neckPitchAngleSlide').addEventListener('input', function() {g_neckPitchAngle = -this.value;})
    document.getElementById('thighAngleSlide').addEventListener('input', function() {g_thighAngle = -this.value;})
    document.getElementById('calfAngleSlide').addEventListener('input', function() {g_calfAngle = -this.value;})
    document.getElementById('backFootAngleSlide').addEventListener('input', function() {g_backFootAngle = -this.value;})
    document.getElementById('forearmAngleSlide').addEventListener('input', function() {g_forearmAngle = -this.value;})
    document.getElementById('wristAngleSlide').addEventListener('input', function() {g_wristAngle = -this.value;})
    document.getElementById('footAngleSlide').addEventListener('input', function() {g_footAngle = -this.value;})
    document.getElementById('yawSlide').addEventListener('input', function() {player.rot.yaw = -this.value;})
    document.getElementById('pitchSlide').addEventListener('input', function() {player.rot.pitch = -this.value;})
    document.getElementById('colorPicker').addEventListener('input', function() {
        const hex = this.value;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        gl.clearColor(r/255, g/255, b/255, 1);
    });

    document.getElementById('lightX').addEventListener('input', function() {light.pos.x = this.value;})
    document.getElementById('lightY').addEventListener('input', function() {light.pos.y = this.value;})
    document.getElementById('lightZ').addEventListener('input', function() {light.pos.z = this.value;})
    toggleLightButton = document.getElementById('toggleLight');
    toggleNormalsButton = document.getElementById('toggleNormals');
}

function pauseButtonClicked() {
    paused = !paused;
    if (paused) {
        pauseButton.value = "Play Animation";
    } else {
        pauseButton.value = "Pause Animation";
    }
}

let rscalls = 0;

let animalModel;
let animalAnim;

function main() {
    setUpWebGL();

    const loadedVars = connectVariablesToGLSL();

    if (!loadedVars) {
        console.error('Failed to initialize shader variables.');
        return false;
    }

    samplerGLInfo.push(
        {
            texture: gl.TEXTURE0,
            sampler: u_Sampler0,
        }
    )
    samplerGLInfo.push(
        {
            texture: gl.TEXTURE1,
            sampler: u_Sampler1,
        },
    )

    loadTextures();

    setUpElements();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmousemove = move;
    canvas.onmouseup = clickup;
    canvas.onmouseleave = exit;
    canvas.onwheel = scroll;

    gl.clearColor(26/255, 0, 36/255, 1);

    // buildModel();
    createParticles();

    gl.uniform1i(u_LightOn, true);
    gl.uniform1i(u_NormalsOn, false);
    const scale = 1/160 * g_globalScale;
    gl.uniform3f(u_SpotPos, -600 * scale + lightXOffset, 0 * scale, -200 * scale);
    gl.uniform3f(u_SpotDir, 1, 0, 1);

    tick();
    updateFPS();

    return true;
}

function toggleLight() {
    if (toggleLightButton.value === 'Light Off') {
        toggleLightButton.value = 'Light On';
        gl.uniform1i(u_LightOn, false);
    } else {
        toggleLightButton.value = 'Light Off';
        gl.uniform1i(u_LightOn, true);
    }
}

function toggleNormals() {
    if (toggleNormalsButton.value === 'Normals Off') {
        toggleNormalsButton.value = 'Normals On';
        gl.uniform1i(u_NormalsOn, false);
    } else {
        toggleNormalsButton.value = 'Normals Off';
        gl.uniform1i(u_NormalsOn, true);
    }
}

function loadTextures() {
    function doTextureThing(image, ID) {

        const info = samplerGLInfo[ID];

        let texture = gl.createTexture();
        
        gl.activeTexture(info.texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(info.sampler, ID);

        return texture;
    }

    function loadImage(name, path, ID) {
        imagesToLoad += 1;
        const image = new Image();
        image.onload = () => {
            textures[name] = {
                id: ID,
                texture: doTextureThing(image, ID),
                image: image,
            }
            imagesToLoad -= 1;
        };
        image.src = path;
    }

    loadImage('dragon', './dragon.png', 0);
    loadImage('debug', './debug.png', 1);
}

function clearScreen() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

const player = {
    pos: new Vector3([0, 0, -7]),
    rot: {
        pitch: 0,
        yaw: 0,
    },
    facing: new Vector3([0, 0, 1]),
};

const light = {
    pos: new Vector3([100, 0, 100]),
}

function renderScene() {
    rscalls++;

    clearScreen();

    const aspectRatio = canvas.width / canvas.height;
    const projectionMatrix = new Matrix4().setPerspective(
        90,
        aspectRatio,
        0.1,
        10000
    );
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projectionMatrix.elements);

    const lookAt = new Vector3(player.facing.elements);
    lookAt.add(player.pos);

    const viewMat = new Matrix4();
    // x, y, z,  x+cx, y+cy, z+cz
    viewMat.setLookAt(...player.pos.elements, ...lookAt.elements,  0,1,0);
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

    const scale = 1/160 * g_globalScale;
    let globalRotMat = new Matrix4()
        // .translate(0, 0, -5)
        .scale(scale, scale, scale)
        // .rotate(player.rot.pitch, 1, 0, 0)
        // .rotate(player.rot.yaw, 0, 1, 0);
    // let globalRotMat = new Matrix4().setIdentity();

    // const scale = 1/160 * g_globalScale;  // Your original line
    // const globalRotMat = new Matrix4().scale(scale, scale, scale).rotate(player.rot.pitch, 1, 0, 0).rotate(player.rot.yaw, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements)

    // const scale = 1/160 * g_globalScale;
    // const globalRotMat = new Matrix4().scale(scale, scale, scale).rotate(player.rot.pitch, 1, 0, 0).rotate(player.rot.yaw, 0, 1, 0);
    // gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements)

    buildModel();
    if (drawParts) drawParticles();

    for (const key in parts) {
        parts[key].render();
    }
}

let variable;
let parts = {};
let particles = [];
let drawParts = true;
let particleXBounds = 2000;
let particleYBounds = 1000;
let particleZBounds = 500;

function toggleParticles() {
    drawParts = !drawParts;
}

function createParticles() {

    function rnd(b) {
        return (Math.random()-0.5)*b*2;
    }

    for (let i = 0; i < 600; i++) {
        particles.push([rnd(particleXBounds), rnd(particleYBounds), rnd(particleZBounds), Math.floor(Math.random()*4)]);
    }
}

function drawParticles() {

    function mapSpace(v, l) {
        if (v < -l) {
            return l;
        }
        if (v > l) {
            return -l;
        }
        return v;
    }

    for (let i = 0; i < particles.length; i++) {
        let particle = particles[i];

        particle[0] += 3 * (1-diveAmount);
        particle[2] += 10 * diveAmount;

        particle[0] = mapSpace(particle[0], particleXBounds);
        particle[1] = mapSpace(particle[1], particleYBounds);
        particle[2] = mapSpace(particle[2], particleZBounds);

        const part = new Plane(particle[0] + particleXBounds * (3/4), particle[1], particle[2] - particleZBounds * (1/4), 5, 5, 5).col(255, 0, 0, 255);
        part.setTexture('dragon');
        part.faceCamera = true;
        part.buildMatrix();
        part.applyTexture("all", [0, 0, 5, 5], particle[3]);
        parts["particle"+i] = part;
    }
}

function buildModel() {
    parts = {};

    // Dragon
    {
        let body = new Cube(0, 0, 0, 0, 0, 0, 1000, 0, 0, "Math.sin(g_seconds*g_speed - 1.9) * 0.2", 0, 1, 0);
        body.setTexture('dragon');
        parts.body = body;
        let bodyAnim = [];
        if (funTimer !== -1) {
            const megaAnim = `
            diveAmount*90;
        `;
            bodyAnim = [0, 0, 0, megaAnim, 0, 1, 0];
        }
        body = body.add(new Cube(0, 0, 0, 64, 24, 24, ...bodyAnim));
        body.applyTexture("top", [8 * 8, 24 * 8, 3 * 8, 8 * 8]);
        body.applyTexture("bottom", [11 * 8, 24 * 8, 3 * 8, 8 * 8]);
        body.applyTexture(["left", "right"], [11 * 8, 21 * 8, 8 * 8, 3 * 8], 1);
        body.applyTexture(["front", "back"], [8 * 8, 21 * 8, 8 * 3, 3 * 8]);
        for (let i = 0; i < 3; i++) {
            const blade = body.add(new Cube(-20 + 20 * i, 0, 15, 12, 2, 6));
            blade.applyTexture(["left", "right"], [256 - 5 * 8 + 4, 256 - 9 * 8 + 1 + 6, 12, -6], 1)
            blade.applyTexture(["front"], [256 - 5 * 8 + 4 + 12, 256 - 9 * 8 + 1, 2, 6])
            blade.applyTexture(["back"], [256 - 5 * 8 + 4 + 12 + 14, 256 - 9 * 8 + 1, 2, 6])
            blade.applyTexture(["top", "bottom"], [256 - 5 * 8 + 4 + 12, 256 - 9 * 8 + 1 + 6, 2, 12])
        }
        let tail = body;
        for (let i = 0; i < 12; i++) {
            tail = tail.add(new Cube(37 + 10 * i, 0, -2.5, 10, 10, 10,
                37 + 10 * i - 5, 0, -2.5,
                "Math.sin((g_seconds+funAnimOffset*2)*g_speed + 1 + 2 + " + i / 2 + ") * (3 * (1-diveAmount) + " + i + "/3 * (diveAmount))",
                0, 1, 0));
            tail.applyTexture("all", [24 * 8 + 1 * 10, 16 * 8 + 4, 10, 10], (i * 2 + 1) % 4);
            tail.applyTexture("top", [24 * 8 + 1 * 10, 16 * 8 + 4 + 10, 10, 10]);
            tail.applyTexture("back", [24 * 8 + 1 * 10, 16 * 8 + 4, 10, 10]);
            const nob = tail.add((new Cube(37 + 10 * i, 0, 4.5, 6, 2, 4)).col(125, 125, 125, 255));
            nob.applyTexture(["left", "right"], [6, 256 - 6, -6, -4], 1);
            nob.applyTexture(["back"], [6, 256 - 6 - 4, 2, 4]);
            nob.applyTexture(["top", "bottom"], [6, 256, 2, -6]);
            nob.applyTexture(["front"], [6, 256 - 6 + 2, 2, 4]);
        }
        let neck = body;
        for (let i = 0; i < 5; i++) {
            neck = neck.add(new Cube(-37 - 10 * i, 0, -2.5, 0.01, 0.01, 0.01, -37 - 10 * i + 5, 0, -2.5, g_neckYawAngle, 0, 0, 1))
            neck = neck.add(new Cube(-37 - 10 * i, 0, -2.5, 10, 10, 10, -37 - 10 * i + 5, 0, -2.5, "(Math.sin(g_seconds*g_speed + " + i / 1.2 + ") + 0.3) * 4 + " + g_neckPitchAngle, 0, 1, 0));
            neck.applyTexture("all", [24 * 8 + 1 * 10, 16 * 8 + 4, 10, 10], (i * 2 + 1) % 4);
            neck.applyTexture("top", [24 * 8 + 1 * 10, 16 * 8 + 4 + 10, 10, 10]);
            const nob = neck.add((new Cube(-37 - 10 * i, 0, 4.5, 6, 2, 4)).col(125, 125, 125, 255));
            nob.applyTexture(["left", "right"], [0, 256 - 6, 6, -4], 1);
            nob.applyTexture(["front"], [6, 256 - 6 - 4, 2, 4]);
            nob.applyTexture(["top", "bottom"], [6, 256 - 6, 2, 6]);
            nob.applyTexture(["back"], [6, 256 - 6 + 2, 2, 4]);
        }
        const head = neck.add(new Cube(-90, 0, -2.5, 16, 16, 16, -90, 0, -2.5, "(Math.sin(g_seconds*g_speed - 1) - 0.3) * 7", 0, 1, 0));
        {
            head.applyTexture("front", [16 * 8, 24 * 8 + 2, 2 * 8, 2 * 8]);
            head.applyTexture("top", [16 * 8, 26 * 8 + 2, 2 * 8, 2 * 8]);
            head.applyTexture("left", [18 * 8, 24 * 8 + 2, 2 * 8, 2 * 8], 3);
            head.applyTexture("right", [18 * 8, 24 * 8 + 2, 2 * 8, 2 * 8], 3);
            head.applyTexture("bottom", [18 * 8, 26 * 8 + 2, 2 * 8, 2 * 8]);
            head.applyTexture("back", [18 * 8, 26 * 8 + 2, 2 * 8, 2 * 8]);
        }
        const nose = head.add(new Cube(-106, 0, -4, 16, 12, 5,)) // nose
        nose.applyTexture("top", [24 * 8, 24 * 8 + 4, 12, 16]);
        nose.applyTexture(["front", "back"], [24 * 8, 24 * 8 - 1, 12, 5]);
        nose.applyTexture("bottom", [24 * 8 + 12, 24 * 8 + 4, 12, 16]);
        nose.applyTexture(["left", "right"], [24 * 8 + 12, 24 * 8 - 1, 16, 5], 1);
        const jaw = head.add(new Cube(-106, 0, -8.5, 16, 12, 4, -98, 0, -8.5, "(Math.sin(g_seconds*g_speed)+1) * 8", 0, 1, 0)) // jaw
        jaw.applyTexture("top", [24 * 8, 24 * 8 - 1 - 16, 12, 16]);
        jaw.applyTexture("bottom", [24 * 8 + 12, 24 * 8 - 1 - 16, 12, 16]);
        jaw.applyTexture(["front", "back"], [24 * 8, 24 * 8 - 1 - 16 - 4, 12, 4]);
        jaw.applyTexture(["left", "right"], [24 * 8 - 16, 24 * 8 - 1 - 16 - 4, 12, 4], 1);

        // Mirrored things
        for (let i = 0; i < 2; i++) {
            const n = i * 2 - 1;

            nose.add(new Cube(-110, 4 * n, -0.5, 4, 2, 2)) // nostril
            const ear = head.add(new Cube(-90, 4 * n, 7.5, 6, 2, 4).col(125, 125, 125, 255)) // ear
            ear.applyTexture(["left", "right"], [0, 256 - 6, 6, -4], 1);
            ear.applyTexture(["front"], [6, 256 - 6 - 4, 2, 4]);
            ear.applyTexture(["top", "bottom"], [6, 256 - 6, 2, 6]);
            ear.applyTexture(["back"], [6, 256 - 6 + 2, 2, 4]);

            const forearm = body.add(new Cube(-16, 12 * n, -6, 24, 8, 8, -24, 16 * n, -6, "(Math.sin(g_seconds*g_speed) - 0.3) * 1 - 13 + " + g_forearmAngle, 0, 1, 0));
            forearm.applyTexture(["top", "bottom", "left", "right"], [14 * 8, 15 * 8, 1 * 8, 3 * 8])
            forearm.applyTexture(["front", "back"], [15 * 8, 18 * 8, 1 * 8, 1 * 8])
            const wrist = forearm.add(new Cube(5, 12 * n, -7, 24, 6, 6, -4, 16 * n, -7, "(Math.sin(g_seconds*g_speed) - 0.3) * 1 - 30 + " + g_wristAngle, 0, 1, 0));
            wrist.applyTexture(["top", "bottom", "left", "right"], [256 - 8 * 4 + 2, 11 * 8, 6, 24])
            wrist.applyTexture(["front", "back"], [256 - 8 * 4 + 2 + 6, 14 * 8, 6, 6])
            const foot = wrist.add(new Cube(18, 12 * n, -12, 4, 8, 16, 15, 16 * n, -7, "(Math.sin(g_seconds*g_speed) - 0.3) * 1 + 43 + " + g_footAngle, 0, 1, 0));
            foot.applyTexture(["front", "back"], [20 * 8, 16 * 8 + 8, 8, 16])
            foot.applyTexture("bottom", [20 * 8, 16 * 8 + 4 + 4, 8, -4])
            foot.applyTexture("top", [21 * 8, 16 * 8 + 4, 8, 4])
            foot.applyTexture(["left", "right"], [18 * 8, 16 * 8 + 4, 16, 4])

            const thigh = body.add(new Cube(33, 16 * n, -3, 32, 16, 16, 25, 16 * n, -3, "(Math.sin(g_seconds*g_speed) + 0.3) * 1 - 30 + " + g_thighAngle, 0, 1, 0));
            thigh.applyTexture(["front", "back"], [8 * 2, 256 - 16, 16, 16]);
            thigh.applyTexture(["top", "bottom", "left", "right"], [8 * 2, 256 - 16 - 32, 16, 32]);
            const shin = thigh.add(new Cube(64, 16 * n, -3, 32, 12, 12, 54, 16 * n, -3, "(Math.sin(g_seconds*g_speed + 2)) * 1 + 30 + " + g_calfAngle, 0, 1, 0));
            shin.applyTexture(["front", "back"], [256 - 6 * 8, 256 - 12, 12, 12])
            shin.applyTexture(["top", "bottom", "left", "right"], [256 - 6 * 8, 256 - 12 - 32, 12, 32])
            const backFoot = shin.add(new Cube(82, 16 * n, -12, 6, 18, 24, 79, 16 * n, -3, "(Math.sin(g_seconds*g_speed + 2)) * 1 + 40 + " + g_backFootAngle, 0, 1, 0));
            backFoot.applyTexture(["front"], [17 * 8, 256 - 8 * 3, 18, 24]);
            backFoot.applyTexture(["back"], [17 * 8 + 18, 256 - 8 * 3, 18, 24]);
            backFoot.applyTexture(["bottom"], [17 * 8, 256 - 8 * 3, 18, -6]);
            backFoot.applyTexture(["top"], [17 * 8 + 18 + 24, 256 - 8 * 3, 18, -6]);
            backFoot.applyTexture(["left", "right"], [17 * 8 + 18, 256 - 8 * 3, 18, -6]);

            // Wings!
            // Wing pitch
            let wingTilt = body.add(new Cube(-20, 12 * n, 12, 0, 0, 0,
                -20, 12 * n, 12,
                `(25 + Math.sin(g_seconds*g_speed + 1) * 10) * (1-diveAmount)
             + 10 * diveAmount`,
                0, 1, 0));
            // Wing yaw
            wingTilt = wingTilt.add(new Cube(-20, 12 * n, 12, 0, 0, 0,
                -20, 12 * n, 12,
                "15 + 25 * diveAmount",
                0, 0, 1 * n));
            // Wing roll
            const wingFrame1 = wingTilt.add(new Cube(-20, 40 * n, 12, 8, 56, 8,
                -20, 12 * n, 12,
                `
            (
            ((Math.sin(g_seconds*g_speed + 2.2)) * 55 - 10) * (1-diveAmount) +
            (Math.sin(funAnimOffset*10)*2) * diveAmount
        )
            * ` + n,
                1, 0, 0).col(125, 125, 125, 255))
            wingFrame1.applyTexture(["left", "right"], [14 * 8, 19 * 8, 1 * 8, 1 * 8]);
            wingFrame1.applyTexture(["top", "bottom", "front", "back"], [15 * 8, 20 * 8, 7 * 8, 1 * 8]);
            const wingFrame2 = wingFrame1.add(new Cube(-18, 96 * n, 12, 4, 56, 4,
                -20, 68 * n, 12,
                `(   ((Math.sin(g_seconds*g_speed + 1)) * 45 + 30) * (1-diveAmount) +
                  (10 + Math.sin(funAnimOffset*45)*2) * diveAmount
              ) * ` + n,
                1, 0, 0).col(125, 125, 125, 255))
            wingFrame2.applyTexture(["left", "right"], [14 * 8, 14 * 8, 1 * 4, 1 * 4]);
            wingFrame2.applyTexture(["top", "bottom", "front", "back"], [15 * 8, 14 * 8, 7 * 8, 1 * 4]);
            const flapClose = wingFrame1.add(new Plane(12, 40 * n, 12, 56, 56, 1));
            flapClose.transparent = true;
            const fixRange = 0.4;
            if (n === 1) {
                flapClose.applyTexture("top", [0, 14 * 8, 7 * 8 - fixRange, 7 * 8]);
            } else {
                flapClose.applyTexture("top", [7 * 8 - fixRange, 14 * 8, -(7 * 8 - fixRange), 7 * 8]);
            }
            const flapFar = wingFrame2.add(new Plane(12, 96 * n, 12, 56, 56, 1));
            flapFar.transparent = true;
            if (n === 1) {
                flapFar.applyTexture("top", [0, 7 * 8, 7 * 8, 7 * 8]);
            } else {
                flapFar.applyTexture("top", [7 * 8, 7 * 8, -7 * 8, 7 * 8]);
            }
        }
    }


    // Ground plane
    {
        let bodyAnim = [];
        let body = new Plane(0, 0, -80, 1000, 1000, 1, ...bodyAnim);
        body.setTexture('debug');
        body.applyTexture(["top"], [0, 0, 1023, 1023]);
        parts.floor = body;
        body.add(new Cube(300, 0, 0, 100, 1000, 200)).color = [0.3, 0, 0, 1];
        body.add(new Cube(0, 300, 0, 1000, 100, 200)).color = [0, 0.5, 0, 1];
    }

    // Skybox
    {
        let body = new Cube(0, 0, 0, -10000, -10000, -10000);
        body.color = [0.0, 0.2, 0.8, 1];
        // body.setTexture('debug');
        // body.applyTexture(["all"], [0, 0, 1023, 1023]);
        parts.skybox = body;
    }

    
    // Cube
    {
        let body = new Cube(0, 0, -50, 10, 10, 10);
        body.color = [0.0, 0.2, 0.8, 1];
        // body.setTexture('debug');
        // body.applyTexture(["all"], [0, 0, 1023, 1023]);
        parts.cube = body;
    }

    // Model
    {
        let body = new Model('teapot.obj', -200, 0, 0, 50, 50, 50);
        body.color = [0.0, 0.2, 0.8, 1];
        // body.setTexture('debug');
        // body.applyTexture(["all"], [0, 0, 1023, 1023]);
        parts.model = body;
    }

    // Sphere
    {
        let sphere = new Sphere(200, 0, 0, 50, 50, 50);
        sphere.color = [1, 0.2, 1, 1];
        parts.sphere = sphere;
    }

    // Light
    {
        let bulb = new Cube(light.pos.x + lightXOffset * g_globalScale * 18, light.pos.y, light.pos.z, -10, -10, -10);
        bulb.color = [2, 2, 0, 1];
        parts.bulb = bulb;
    }
}

let lightXOffset = 0;

function updateAnimationAngles() {
    g_seconds = performance.now()/1000.0-g_startTime;

    lightXOffset = Math.sin(g_seconds) * 2;

    if (funTimer !== -1) {
        const oldFunTimer = funTimer;
        funTimer = performance.now()/1000.0-funTimerStart;

        function _cos(v) {
            return (-Math.cos(v) + 1)/2;
        }

        if (funTimer < diveTime) {
            diveAmount = _cos((funTimer/diveTime)*Math.PI);
        } else if (funTimer < stillTime + diveTime){
            diveAmount = 1;
        } else {
            diveAmount = _cos((funTimer - stillTime)/diveTime*Math.PI);
        }
        if (funTimer >= stillTime + diveTime + diveTime) {
            funTimer = -1;
            diveAmount = 0;
        }

        funAnimOffset += (funTimer - oldFunTimer) * diveAmount;
    }
}

function tick() {
    requestAnimationFrame(tick);

    if (imagesToLoad !== 0) {
        return;
    }

    handleMovement();
    
    let scale = 1/160 * g_globalScale;
    scale = 1;
    gl.uniform3f(u_CameraPos, player.pos.x * scale, player.pos.y * scale, player.pos.z * scale);

    if (!paused) {
        updateAnimationAngles();
    }

    scale = 1/160 * g_globalScale;
    gl.uniform3f(u_LightPos, light.pos.x * scale + lightXOffset, light.pos.z * scale, light.pos.y * scale);

    renderScene();
}

function handleMovement() {
    const keySense = 2;
    if (isKeyDown("RotateLeft")) {
        player.rot.yaw += keySense;
    }
    if (isKeyDown("RotateRight")) {
        player.rot.yaw -= keySense;
    }

    player.facing.x = Math.cos(player.rot.pitch/180*Math.PI) * Math.sin(player.rot.yaw/180*Math.PI);
    player.facing.y = Math.sin(player.rot.pitch/180*Math.PI);
    player.facing.z = Math.cos(player.rot.pitch/180*Math.PI) * Math.cos(player.rot.yaw/180*Math.PI);


    let keys = {
        Forward: new Vector3([0, 0, 1]),
        Backward: new Vector3([0, 0, -1]),
        Left: new Vector3([1, 0, 0]),
        Right: new Vector3([-1, 0, 0]),
    }

    const moveVec = new Vector3([0, 0, 0]);

    for (let mk in keys) {
        if (isKeyDown(mk)) {
            moveVec.add(keys[mk]);
        }
    }

    if (moveVec.magnitude() < 0.01) return;
    moveVec.normalize();
    moveVec.rotY(-player.rot.yaw*Math.PI/180);

    const moveSpeed = 0.1;
    moveVec.mul(moveSpeed);

    player.pos.add(moveVec);
}

function sendTextToHTML(text, ID) {
    let htmlElm = document.getElementById(ID);
    htmlElm.innerHTML = text;
}

let g_points = [];
let g_selectedColor = [1, 1, 1, 1];
let g_globalScale = 3;
let g_startTime = performance.now()/1000.0;
let g_seconds = performance.now()/1000.0-g_startTime;
let g_speed = 3.7;

// Animation thingies:
let g_neckYawAngle = 0;
let g_neckPitchAngle = 0;
let g_thighAngle = 0;
let g_calfAngle = 0;
let g_backFootAngle = 0;
let g_forearmAngle = 0;
let g_wristAngle = 0;
let g_footAngle = 0;

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

function updateFPS(now) {
  frameCount++;

  const delta = now - lastTime;

  // Update FPS about once per second
  if (delta >= 1000) {
    fps = (frameCount * 1000) / delta;
    fpsElement.textContent = `FPS: ${fps.toFixed(1)}`;

    frameCount = 0;
    lastTime = now;

    rscalls = 0;
  }

  requestAnimationFrame(updateFPS);
}

// Below code was hevily inspired by ChatGPT code

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let dragSensitivity = 0.8;
let funAnim = -1;

let funTimer = -1;
let funTimerStart = 0;
let funAnimOffset = 0;

let diveAmount = 0;
let diveTime = 2;
let stillTime = 3;

function funAnimation() {
    funTimer = 0;
    funTimerStart = performance.now()/1000.0;
}

function click(event) {
    if (event.shiftKey && funTimer === -1) {
        funAnim = false;
        funAnimation();
        return;
    }
    dragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    funAnim = true;
}
function move(event) {
    if (!dragging) {
        return;
    }
    funAnim = false;
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    let dragX = -deltaX * dragSensitivity;
    let dragY = -deltaY * dragSensitivity;

    player.rot.yaw += dragX;
    player.rot.pitch += dragY;
    if (player.rot.pitch < -89) {
        player.rot.pitch = -89;
    }
    if (player.rot.pitch > 89) {
        player.rot.pitch = 89;
    }


    player.facing.x = Math.cos(player.rot.pitch/180*Math.PI) * Math.sin(player.rot.yaw/180*Math.PI);
    player.facing.y = Math.sin(player.rot.pitch/180*Math.PI);
    player.facing.z = Math.cos(player.rot.pitch/180*Math.PI) * Math.cos(player.rot.yaw/180*Math.PI);

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}
function clickup(event) {
    if (funAnim && funTimer === -1) {
        funAnimation();
    }

    dragging = false;
}
function exit(event) {
    dragging = false;
}
function scroll(event) {
    const scroll = event.deltaY;
    g_globalScale *= (-scroll) * 0.001 + 1;
    event.preventDefault();
}

// Inspired by code from ChatGPT
const pressedKeys = new Set();
const keyLists = {
    "Forward": ["ArrowUp", "KeyW"],
    "Backward": ["ArrowDown", "KeyS"],
    "Left": ["ArrowLeft", "KeyA"],
    "Right": ["ArrowRight", "KeyD"],
    "RotateLeft": ["KeyQ"],
    "RotateRight": ["KeyE"],
}
const allowedKeys = [];
for (let value of Object.values(keyLists)) {
    for (let key of value) {
        allowedKeys.push(key);
    }
}

window.addEventListener("keydown", (e) => {
    if (!allowedKeys.includes(e.code)) return;
    e.preventDefault();
    let code = e.code;
    pressedKeys.add(code);
});

window.addEventListener("keyup", (e) => {
    if (!allowedKeys.includes(e.code)) return;
    pressedKeys.delete(e.code);
});

function getPressedKeys() {
    return Array.from(pressedKeys);
}

function isKeyDown(name) {

    if (!Object.keys(keyLists).includes(name)) {
        console.error("Key '" + name + "' does not exist.");
        return false;
    }

    

    const actionKeys = keyLists[name];
    for (let actionKey of actionKeys) {
        if (pressedKeys.has(actionKey)) {
            return true;
        }
    }

    return false;
}
