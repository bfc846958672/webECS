// TODO: upload empty texture if null ? maybe not
// TODO: upload identity matrix if null ?
// TODO: sampler Cube

interface Uniform {
    value: any;
    [key: string]: any;
}

interface BlendFunc {
    src?: GLenum;
    dst?: GLenum;
    srcAlpha?: GLenum;
    dstAlpha?: GLenum;
}

interface BlendEquation {
    modeRGB?: GLenum;
    modeAlpha?: GLenum;
}

interface StencilFunc {
    func?: GLenum;
    ref?: number;
    mask?: number;
}

interface StencilOp {
    stencilFail?: GLenum;
    depthFail?: GLenum;
    depthPass?: GLenum;
}

interface ProgramOptions {
    vertex?: string;
    fragment?: string;
    uniforms?: Record<string, Uniform>;
    transparent?: boolean;
    cullFace?: GLenum;
    frontFace?: GLenum;
    depthTest?: boolean;
    depthWrite?: boolean;
    depthFunc?: GLenum;
}

let ID = 1;

// cache of typed arrays used to flatten uniform arrays
const arrayCacheF32: Record<number, Float32Array> = {};

export class Program {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    uniforms: Record<string, Uniform>;
    id: number;
    transparent: boolean;
    cullFace: GLenum;
    frontFace: GLenum;
    depthTest: boolean;
    depthWrite: boolean;
    depthFunc: GLenum;
    blendFunc: BlendFunc;
    blendEquation: BlendEquation;
    stencilFunc: StencilFunc;
    stencilOp: StencilOp;
    stencilRef: number;
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
    program: WebGLProgram;
    uniformLocations: Map<WebGLActiveInfo, WebGLUniformLocation>;
    attributeLocations: Map<WebGLActiveInfo, number>;
    attributeOrder: string;

    constructor(
        gl: WebGLRenderingContext | WebGL2RenderingContext,
        {
            vertex,
            fragment,
            uniforms = {},
            transparent = false,
            cullFace = gl.BACK,
            frontFace = gl.CW,
            depthTest = true,
            depthWrite = true,
            depthFunc = gl.LEQUAL,
        }: ProgramOptions = {}
    ) {
        if (!gl.canvas) console.error('gl not passed as first argument to Program');
        this.gl = gl;
        this.uniforms = uniforms;
        this.id = ID++;

        if (!vertex) console.warn('vertex shader not supplied');
        if (!fragment) console.warn('fragment shader not supplied');

        // Store program state
        this.transparent = transparent;
        this.cullFace = cullFace;
        this.frontFace = frontFace;
        this.depthTest = depthTest;
        this.depthWrite = depthWrite;
        this.depthFunc = depthFunc;
        this.blendFunc = {};
        this.blendEquation = {};
        this.stencilFunc = {};
        this.stencilOp = {};
        this.stencilRef = 0;

        // Initialize properties to avoid definite assignment errors
        this.uniformLocations = new Map();
        this.attributeLocations = new Map();
        this.attributeOrder = '';

        // set default blendFunc if transparent flagged
        if (this.transparent && !this.blendFunc.src) {
            if ((this.gl as any).renderer.premultipliedAlpha) {
                this.setBlendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
            } else {
                this.setBlendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            }
        }

        // Create empty shaders and attach to program
        this.vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
        this.program = gl.createProgram() as WebGLProgram;
        gl.attachShader(this.program, this.vertexShader);
        gl.attachShader(this.program, this.fragmentShader);

        // Compile shaders with source
        this.setShaders({ vertex, fragment });
    }

    setShaders({ vertex, fragment }: { vertex?: string; fragment?: string }): void {
        if (vertex) {
            // compile vertex shader and log errors
            this.gl.shaderSource(this.vertexShader, vertex);
            this.gl.compileShader(this.vertexShader);
            if (this.gl.getShaderInfoLog(this.vertexShader) !== '') {
                console.warn(`${this.gl.getShaderInfoLog(this.vertexShader)}\nVertex Shader\n${addLineNumbers(vertex)}`);
            }
        }

        if (fragment) {
            // compile fragment shader and log errors
            this.gl.shaderSource(this.fragmentShader, fragment);
            this.gl.compileShader(this.fragmentShader);
            if (this.gl.getShaderInfoLog(this.fragmentShader) !== '') {
                console.warn(`${this.gl.getShaderInfoLog(this.fragmentShader)}\nFragment Shader\n${addLineNumbers(fragment)}`);
            }
        }

        // compile program and log errors
        this.gl.linkProgram(this.program);
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            return console.warn(this.gl.getProgramInfoLog(this.program));
        }

        // Get active uniform locations
        this.uniformLocations = new Map();
        let numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
        for (let uIndex = 0; uIndex < numUniforms; uIndex++) {
            let uniform = this.gl.getActiveUniform(this.program, uIndex) as WebGLActiveInfo;
            this.uniformLocations.set(uniform, this.gl.getUniformLocation(this.program, uniform.name) as WebGLUniformLocation);

            // split uniforms' names to separate array and struct declarations
            const split = uniform.name.match(/(\w+)/g);
            if (split) {
                (uniform as any).uniformName = split[0];
                (uniform as any).nameComponents = split.slice(1);
            }
        }

        // Get active attribute locations
        this.attributeLocations = new Map();
        const locations: string[] = [];
        const numAttribs = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
        for (let aIndex = 0; aIndex < numAttribs; aIndex++) {
            const attribute = this.gl.getActiveAttrib(this.program, aIndex) as WebGLActiveInfo;
            const location = this.gl.getAttribLocation(this.program, attribute.name);
            // Ignore special built-in inputs. eg gl_VertexID, gl_InstanceID
            if (location === -1) continue;
            locations[location] = attribute.name;
            this.attributeLocations.set(attribute, location);
        }
        this.attributeOrder = locations.join('');
    }

    setBlendFunc(src: GLenum, dst: GLenum, srcAlpha?: GLenum, dstAlpha?: GLenum): void {
        this.blendFunc.src = src;
        this.blendFunc.dst = dst;
        this.blendFunc.srcAlpha = srcAlpha;
        this.blendFunc.dstAlpha = dstAlpha;
        if (src) this.transparent = true;
    }

    setBlendEquation(modeRGB?: GLenum, modeAlpha?: GLenum): void {
        this.blendEquation.modeRGB = modeRGB;
        this.blendEquation.modeAlpha = modeAlpha;
    }

    setStencilFunc(func: GLenum, ref: number, mask: number): void {
        this.stencilRef = ref;
        this.stencilFunc.func = func;
        this.stencilFunc.ref = ref;
        this.stencilFunc.mask = mask;
    }

    setStencilOp(stencilFail: GLenum, depthFail: GLenum, depthPass: GLenum): void {
        this.stencilOp.stencilFail = stencilFail;
        this.stencilOp.depthFail = depthFail;
        this.stencilOp.depthPass = depthPass;
    }

    applyState(): void {
        if (this.depthTest) {
            (this.gl as any).renderer.enable(this.gl.DEPTH_TEST);
        } else {
            (this.gl as any).renderer.disable(this.gl.DEPTH_TEST);
        }

        if (this.cullFace) {
            (this.gl as any).renderer.enable(this.gl.CULL_FACE);
        } else {
            (this.gl as any).renderer.disable(this.gl.CULL_FACE);
        }

        if (this.blendFunc.src) {
            (this.gl as any).renderer.enable(this.gl.BLEND);
        } else {
            (this.gl as any).renderer.disable(this.gl.BLEND);
        }

        if (this.cullFace) {
            (this.gl as any).renderer.setCullFace(this.cullFace);
        }
        (this.gl as any).renderer.setFrontFace(this.frontFace);
        (this.gl as any).renderer.setDepthMask(this.depthWrite);
        (this.gl as any).renderer.setDepthFunc(this.depthFunc);
        if (this.blendFunc.src) {
            (this.gl as any).renderer.setBlendFunc(
                this.blendFunc.src,
                this.blendFunc.dst,
                this.blendFunc.srcAlpha,
                this.blendFunc.dstAlpha
            );
        }
        (this.gl as any).renderer.setBlendEquation(this.blendEquation.modeRGB, this.blendEquation.modeAlpha);

        if (this.stencilFunc.func || this.stencilOp.stencilFail) {
            (this.gl as any).renderer.enable(this.gl.STENCIL_TEST);
        } else {
            (this.gl as any).renderer.disable(this.gl.STENCIL_TEST);
        }

        (this.gl as any).renderer.setStencilFunc(this.stencilFunc.func, this.stencilFunc.ref, this.stencilFunc.mask);
        (this.gl as any).renderer.setStencilOp(
            this.stencilOp.stencilFail,
            this.stencilOp.depthFail,
            this.stencilOp.depthPass
        );
    }

    use({ flipFaces = false }: { flipFaces?: boolean } = {}): void {
        let textureUnit = -1;
        const programActive = (this.gl as any).renderer.state.currentProgram === this.id;

        // Avoid gl call if program already in use
        if (!programActive) {
            this.gl.useProgram(this.program);
            (this.gl as any).renderer.state.currentProgram = this.id;
        }

        // Set only the active uniforms found in the shader
        this.uniformLocations.forEach((location, activeUniform) => {
            let uniform = this.uniforms[(activeUniform as any).uniformName];

            for (const component of (activeUniform as any).nameComponents) {
                if (!uniform) break;

                if (component in uniform) {
                    uniform = uniform[component];
                } else if (Array.isArray(uniform.value)) {
                    break;
                } else {
                    return warn(`Active uniform ${activeUniform.name} has invalid structure`);
                }
            }

            if (!uniform) {
                return warn(`Active uniform ${activeUniform.name} has not been supplied`);
            }

            if (uniform && uniform.value === undefined) {
                return warn(`${activeUniform.name} uniform is missing a value parameter`);
            }

            if (uniform.value.texture) {
                textureUnit = textureUnit + 1;

                // Check if texture needs to be updated
                uniform.value.update(textureUnit);
                return setUniform(this.gl, activeUniform.type, location, textureUnit);
            }

            // For texture arrays, set uniform as an array of texture units instead of just one
            if (uniform.value.length && uniform.value[0].texture) {
                const textureUnits: number[] = [];
                uniform.value.forEach((value: any) => {
                    textureUnit = textureUnit + 1;
                    value.update(textureUnit);
                    textureUnits.push(textureUnit);
                });

                return setUniform(this.gl, activeUniform.type, location, textureUnits);
            }

            setUniform(this.gl, activeUniform.type, location, uniform.value);
        });

        this.applyState();
        if (flipFaces) {
            (this.gl as any).renderer.setFrontFace(
                this.frontFace === this.gl.CCW ? this.gl.CW : this.gl.CCW
            );
        }
    }

    remove(): void {
        this.gl.deleteProgram(this.program);
    }
}

function setUniform(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    type: number,
    location: WebGLUniformLocation,
    value: any
): void {
    value = value.length ? flatten(value) : value;
    const setValue = (gl as any).renderer.state.uniformLocations.get(location);

    // Avoid redundant uniform commands
    if (value.length) {
        if (setValue === undefined || setValue.length !== value.length) {
            // clone array to store as cache
            (gl as any).renderer.state.uniformLocations.set(location, value.slice(0));
        } else {
            if (arraysEqual(setValue, value)) return;

            // Update cached array values
            setValue.set ? setValue.set(value) : setArray(setValue, value);
            (gl as any).renderer.state.uniformLocations.set(location, setValue);
        }
    } else {
        if (setValue === value) return;
        (gl as any).renderer.state.uniformLocations.set(location, value);
    }

    switch (type) {
        case 5126: // FLOAT
            return value.length ? gl.uniform1fv(location, value) : gl.uniform1f(location, value);
        case 35664: // FLOAT_VEC2
            return gl.uniform2fv(location, value);
        case 35665: // FLOAT_VEC3
            return gl.uniform3fv(location, value);
        case 35666: // FLOAT_VEC4
            return gl.uniform4fv(location, value);
        case 35670: // BOOL
        case 5124: // INT
        case 35678: // SAMPLER_2D
        case 36306: // U_SAMPLER_2D
        case 35680: // SAMPLER_CUBE
        case 36289: // SAMPLER_2D_ARRAY
            return value.length ? gl.uniform1iv(location, value) : gl.uniform1i(location, value);
        case 35671: // BOOL_VEC2
        case 35667: // INT_VEC2
            return gl.uniform2iv(location, value);
        case 35672: // BOOL_VEC3
        case 35668: // INT_VEC3
            return gl.uniform3iv(location, value);
        case 35673: // BOOL_VEC4
        case 35669: // INT_VEC4
            return gl.uniform4iv(location, value);
        case 35674: // FLOAT_MAT2
            return gl.uniformMatrix2fv(location, false, value);
        case 35675: // FLOAT_MAT3
            return gl.uniformMatrix3fv(location, false, value);
        case 35676: // FLOAT_MAT4
            return gl.uniformMatrix4fv(location, false, value);
    }
}

function addLineNumbers(string: string): string {
    let lines = string.split('\n');
    for (let i = 0; i < lines.length; i++) {
        lines[i] = i + 1 + ': ' + lines[i];
    }
    return lines.join('\n');
}

function flatten(a: any[]): Float32Array | number[] {
    const arrayLen = a.length;
    const valueLen = a[0].length;
    if (valueLen === undefined) return a;
    const length = arrayLen * valueLen;
    let value: Float32Array = arrayCacheF32[length];
    if (!value) arrayCacheF32[length] = value = new Float32Array(length);
    for (let i = 0; i < arrayLen; i++) value.set(a[i], i * valueLen);
    return value;
}

function arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0, l = a.length; i < l; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function setArray(a: any[], b: any[]): void {
    for (let i = 0, l = a.length; i < l; i++) {
        a[i] = b[i];
    }
}

let warnCount = 0;
function warn(message: string): void {
    if (warnCount > 100) return;
    console.warn(message);
    warnCount++;
    if (warnCount > 100) console.warn('More than 100 program warnings - stopping logs.');
}