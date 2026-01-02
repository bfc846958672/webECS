import { Vec3 } from '../math/Vec3';

// Extend WebGL types to include renderer property
declare global {
    interface WebGLRenderingContext {
        renderer: Renderer;
    }
    interface WebGL2RenderingContext {
        renderer: Renderer;
    }
}

interface RendererOptions {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    dpr?: number;
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
    antialias?: boolean;
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    autoClear?: boolean;
    webgl?: 1 | 2;
}

interface State {
    blendFunc: {
        src: GLenum;
        dst: GLenum;
        srcAlpha?: GLenum;
        dstAlpha?: GLenum;
    };
    blendEquation: {
        modeRGB: GLenum;
        modeAlpha?: GLenum;
    };
    cullFace: GLenum | false;
    frontFace: GLenum;
    depthMask: boolean;
    depthFunc: GLenum;
    premultiplyAlpha: boolean;
    flipY: boolean;
    unpackAlignment: number;
    framebuffer: WebGLFramebuffer | null;
    viewport: {
        x: number;
        y: number;
        width: number | null;
        height: number | null;
    };
    textureUnits: any[];
    activeTextureUnit: number;
    boundBuffer: WebGLBuffer | null;
    uniformLocations: Map<any, any>;
    currentProgram: number | null;
    // Additional state properties used in methods
    [key: string]: any;
}

interface Parameters {
    maxTextureUnits: number;
    maxAnisotropy: number;
}

interface BindFramebufferOptions {
    target?: GLenum;
    buffer?: WebGLFramebuffer | null;
}

interface RenderListOptions {
    scene: any;
    camera?: any;
    frustumCull?: boolean;
    sort?: boolean;
}

interface RenderOptions {
    scene: any;
    camera?: any;
    target?: any;
    update?: boolean;
    sort?: boolean;
    frustumCull?: boolean;
    clear?: boolean;
}

const tempVec3 = /* @__PURE__ */ new Vec3();
let ID = 1;

export class Renderer {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    isWebgl2: boolean;
    dpr: number;
    alpha: boolean;
    color: boolean;
    depth: boolean;
    stencil: boolean;
    premultipliedAlpha: boolean;
    autoClear: boolean;
    id: number;
    width: number = 300;
    height: number = 150;
    state: State;
    extensions: Record<string, any>;
    parameters: Parameters;
    vertexAttribDivisor: (index: number, divisor: number) => void;
    drawArraysInstanced: (mode: GLenum, first: number, count: number, primcount: number) => void;
    drawElementsInstanced: (mode: GLenum, count: number, type: GLenum, offset: number, primcount: number) => void;
    createVertexArray: () => WebGLVertexArrayObject | null;
    bindVertexArray: (array: WebGLVertexArrayObject | null) => void;
    deleteVertexArray: (array: WebGLVertexArrayObject | null) => void;
    drawBuffers: (bufs: GLenum[]) => void;

    constructor(
        {
            canvas = document.createElement('canvas'),
            width = 300,
            height = 150,
            dpr = 1,
            alpha = false,
            depth = true,
            stencil = false,
            antialias = false,
            premultipliedAlpha = false,
            preserveDrawingBuffer = false,
            powerPreference = 'default',
            autoClear = true,
            webgl = 2,
        }: RendererOptions = {}
    ) {
        const attributes = { alpha, depth, stencil, antialias, premultipliedAlpha, preserveDrawingBuffer, powerPreference };
        this.dpr = dpr;
        this.alpha = alpha;
        this.color = true;
        this.depth = depth;
        this.stencil = stencil;
        this.premultipliedAlpha = premultipliedAlpha;
        this.autoClear = autoClear;
        this.id = ID++;

        // Attempt WebGL2 unless forced to 1, if not supported fallback to WebGL1
        let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
        if (webgl === 2) gl = canvas.getContext('webgl2', attributes) as WebGL2RenderingContext | null;
        this.isWebgl2 = !!gl;
        if (!gl) gl = canvas.getContext('webgl', attributes) as WebGLRenderingContext | null;
        if (!gl) throw new Error('unable to create webgl context');
        this.gl = gl;

        // Attach renderer to gl so that all classes have access to internal state functions
        this.gl.renderer = this;

        // initialise size values
        this.setSize(width, height);

        // gl state stores to avoid redundant calls on methods used internally
        this.state = {
            blendFunc: { src: this.gl.ONE, dst: this.gl.ZERO },
            blendEquation: { modeRGB: this.gl.FUNC_ADD },
            cullFace: false,
            frontFace: this.gl.CCW,
            depthMask: true,
            depthFunc: this.gl.LEQUAL,
            premultiplyAlpha: false,
            flipY: false,
            unpackAlignment: 4,
            framebuffer: null,
            viewport: { x: 0, y: 0, width: null, height: null },
            textureUnits: [],
            activeTextureUnit: 0,
            boundBuffer: null,
            uniformLocations: new Map(),
            currentProgram: null,
        };

        // store requested extensions
        this.extensions = {};

        // Initialise extra format types
        if (this.isWebgl2) {
            this.getExtension('EXT_color_buffer_float');
            this.getExtension('OES_texture_float_linear');
        } else {
            this.getExtension('OES_texture_float');
            this.getExtension('OES_texture_float_linear');
            this.getExtension('OES_texture_half_float');
            this.getExtension('OES_texture_half_float_linear');
            this.getExtension('OES_element_index_uint');
            this.getExtension('OES_standard_derivatives');
            this.getExtension('EXT_sRGB');
            this.getExtension('WEBGL_depth_texture');
            this.getExtension('WEBGL_draw_buffers');
        }
        this.getExtension('WEBGL_compressed_texture_astc');
        this.getExtension('EXT_texture_compression_bptc');
        this.getExtension('WEBGL_compressed_texture_s3tc');
        this.getExtension('WEBGL_compressed_texture_etc1');
        this.getExtension('WEBGL_compressed_texture_pvrtc');
        this.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');

        // Create method aliases using extension (WebGL1) or native if available (WebGL2)
        this.vertexAttribDivisor = this.getExtension('ANGLE_instanced_arrays', 'vertexAttribDivisor', 'vertexAttribDivisorANGLE') as (index: number, divisor: number) => void;
        this.drawArraysInstanced = this.getExtension('ANGLE_instanced_arrays', 'drawArraysInstanced', 'drawArraysInstancedANGLE') as (mode: GLenum, first: number, count: number, primcount: number) => void;
        this.drawElementsInstanced = this.getExtension('ANGLE_instanced_arrays', 'drawElementsInstanced', 'drawElementsInstancedANGLE') as (mode: GLenum, count: number, type: GLenum, offset: number, primcount: number) => void;
        this.createVertexArray = this.getExtension('OES_vertex_array_object', 'createVertexArray', 'createVertexArrayOES') as () => WebGLVertexArrayObject | null;
        this.bindVertexArray = this.getExtension('OES_vertex_array_object', 'bindVertexArray', 'bindVertexArrayOES') as (array: WebGLVertexArrayObject | null) => void;
        this.deleteVertexArray = this.getExtension('OES_vertex_array_object', 'deleteVertexArray', 'deleteVertexArrayOES') as (array: WebGLVertexArrayObject | null) => void;
        this.drawBuffers = this.getExtension('WEBGL_draw_buffers', 'drawBuffers', 'drawBuffersWEBGL') as (bufs: GLenum[]) => void;

        // Store device parameters
        this.parameters = {} as Parameters;
        this.parameters.maxTextureUnits = this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number;
        this.parameters.maxAnisotropy = this.getExtension('EXT_texture_filter_anisotropic')
            ? this.gl.getParameter(this.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number
            : 0;
    }

    setSize(width: number, height: number): void {
        this.width = width;
        this.height = height;

        this.gl.canvas.width = width * this.dpr;
        this.gl.canvas.height = height * this.dpr;

        // Only set style if canvas is an HTMLCanvasElement (not OffscreenCanvas)
        if ('style' in this.gl.canvas) {
            Object.assign((this.gl.canvas as HTMLCanvasElement).style, {
                width: width + 'px',
                height: height + 'px',
            });
        }
    }

    setViewport(width: number, height: number, x: number = 0, y: number = 0): void {
        if (this.state.viewport.width === width && this.state.viewport.height === height) return;
        this.state.viewport.width = width;
        this.state.viewport.height = height;
        this.state.viewport.x = x;
        this.state.viewport.y = y;
        this.gl.viewport(x, y, width, height);
    }

    setScissor(width: number, height: number, x: number = 0, y: number = 0): void {
        this.gl.scissor(x, y, width, height);
    }

    enable(id: GLenum): void {
        if (this.state[id] === true) return;
        this.gl.enable(id);
        this.state[id] = true;
    }

    disable(id: GLenum): void {
        if (this.state[id] === false) return;
        this.gl.disable(id);
        this.state[id] = false;
    }

    setBlendFunc(src: GLenum, dst: GLenum, srcAlpha?: GLenum, dstAlpha?: GLenum): void {
        if (
            this.state.blendFunc.src === src &&
            this.state.blendFunc.dst === dst &&
            this.state.blendFunc.srcAlpha === srcAlpha &&
            this.state.blendFunc.dstAlpha === dstAlpha
        )
            return;
        this.state.blendFunc.src = src;
        this.state.blendFunc.dst = dst;
        this.state.blendFunc.srcAlpha = srcAlpha;
        this.state.blendFunc.dstAlpha = dstAlpha;
        if (srcAlpha !== undefined) this.gl.blendFuncSeparate(src, dst, srcAlpha, dstAlpha || dst);
        else this.gl.blendFunc(src, dst);
    }

    setBlendEquation(modeRGB: GLenum, modeAlpha?: GLenum): void {
        modeRGB = modeRGB || this.gl.FUNC_ADD;
        if (this.state.blendEquation.modeRGB === modeRGB && this.state.blendEquation.modeAlpha === modeAlpha) return;
        this.state.blendEquation.modeRGB = modeRGB;
        this.state.blendEquation.modeAlpha = modeAlpha;
        if (modeAlpha !== undefined) this.gl.blendEquationSeparate(modeRGB, modeAlpha);
        else this.gl.blendEquation(modeRGB);
    }

    setCullFace(value: GLenum): void {
        if (this.state.cullFace === value) return;
        this.state.cullFace = value;
        this.gl.cullFace(value);
    }

    setFrontFace(value: GLenum): void {
        if (this.state.frontFace === value) return;
        this.state.frontFace = value;
        this.gl.frontFace(value);
    }

    setDepthMask(value: boolean): void {
        if (this.state.depthMask === value) return;
        this.state.depthMask = value;
        this.gl.depthMask(value);
    }

    setDepthFunc(value: GLenum): void {
        if (this.state.depthFunc === value) return;
        this.state.depthFunc = value;
        this.gl.depthFunc(value);
    }

    setStencilMask(value: number): void {
        if (this.state.stencilMask === value) return;
        this.state.stencilMask = value;
        this.gl.stencilMask(value);
    }

    setStencilFunc(func: GLenum, ref: number, mask: number): void {
        if (
            this.state.stencilFunc === func &&
            this.state.stencilRef === ref &&
            this.state.stencilFuncMask === mask
        )
            return;
        this.state.stencilFunc = func || this.gl.ALWAYS;
        this.state.stencilRef = ref || 0;
        this.state.stencilFuncMask = mask || 0;
        this.gl.stencilFunc(func || this.gl.ALWAYS, ref || 0, mask || 0);
    }

    setStencilOp(stencilFail: GLenum, depthFail: GLenum, depthPass: GLenum): void {
        if (
            this.state.stencilFail === stencilFail &&
            this.state.stencilDepthFail === depthFail &&
            this.state.stencilDepthPass === depthPass
        )
            return;
        this.state.stencilFail = stencilFail;
        this.state.stencilDepthFail = depthFail;
        this.state.stencilDepthPass = depthPass;
        this.gl.stencilOp(stencilFail, depthFail, depthPass);
    }

    activeTexture(value: number): void {
        if (this.state.activeTextureUnit === value) return;
        this.state.activeTextureUnit = value;
        this.gl.activeTexture(this.gl.TEXTURE0 + value);
    }

    bindFramebuffer({ target = this.gl.FRAMEBUFFER, buffer = null }: BindFramebufferOptions = {}): void {
        if (this.state.framebuffer === buffer) return;
        this.state.framebuffer = buffer;
        this.gl.bindFramebuffer(target, buffer);
    }

    getExtension(extension: string, webgl2Func?: string, extFunc?: string): any {
        // if webgl2 function supported, return func bound to gl context
        if (webgl2Func && (this.gl as any)[webgl2Func]) {
            return (this.gl as any)[webgl2Func].bind(this.gl);
        }

        // fetch extension once only
        if (!this.extensions[extension]) {
            this.extensions[extension] = this.gl.getExtension(extension);
        }

        // return extension if no function requested
        if (!webgl2Func) return this.extensions[extension];

        // Return null if extension not supported
        if (!this.extensions[extension]) return null;

        // return extension function, bound to extension
        if (typeof extFunc !== 'string') return null;
        return this.extensions[extension][extFunc].bind(this.extensions[extension]);
    }

    sortOpaque(a: any, b: any): number {
        if (a.renderOrder !== b.renderOrder) {
            return a.renderOrder - b.renderOrder;
        } else if (a.program.id !== b.program.id) {
            return a.program.id - b.program.id;
        } else if (a.zDepth !== b.zDepth) {
            return a.zDepth - b.zDepth;
        } else {
            return b.id - a.id;
        }
    }

    sortTransparent(a: any, b: any): number {
        if (a.renderOrder !== b.renderOrder) {
            return a.renderOrder - b.renderOrder;
        }
        if (a.zDepth !== b.zDepth) {
            return b.zDepth - a.zDepth;
        } else {
            return b.id - a.id;
        }
    }

    sortUI(a: any, b: any): number {
        if (a.renderOrder !== b.renderOrder) {
            return a.renderOrder - b.renderOrder;
        } else if (a.program.id !== b.program.id) {
            return a.program.id - b.program.id;
        } else {
            return b.id - a.id;
        }
    }

    getRenderList({ scene, camera, frustumCull, sort }: RenderListOptions): any[] {
        let renderList: any[] = [];

        if (camera && frustumCull) camera.updateFrustum();

        // Get visible
        scene.traverse((node: any) => {
            if (!node.visible) return true;
            if (!node.draw) return;

            if (frustumCull && node.frustumCulled && camera) {
                if (!camera.frustumIntersectsMesh(node)) return;
            }

            renderList.push(node);
        });

        if (sort) {
            const opaque: any[] = [];
            const transparent: any[] = []; // depthTest true
            const ui: any[] = []; // depthTest false

            renderList.forEach((node: any) => {
                // Split into the 3 render groups
                if (!node.program.transparent) {
                    opaque.push(node);
                } else if (node.program.depthTest) {
                    transparent.push(node);
                } else {
                    ui.push(node);
                }

                node.zDepth = 0;

                // Only calculate z-depth if renderOrder unset and depthTest is true
                if (node.renderOrder !== 0 || !node.program.depthTest || !camera) return;

                // update z-depth
                node.worldMatrix.getTranslation(tempVec3);
                tempVec3.applyMatrix4(camera.projectionViewMatrix);
                node.zDepth = tempVec3.z;
            });

            opaque.sort(this.sortOpaque.bind(this));
            transparent.sort(this.sortTransparent.bind(this));
            ui.sort(this.sortUI.bind(this));

            renderList = opaque.concat(transparent, ui);
        }

        return renderList;
    }

    render({ scene, camera, target = null, update = true, sort = true, frustumCull = true, clear }: RenderOptions): void {
        if (target === null) {
            // make sure no render target bound so draws to canvas
            this.bindFramebuffer();
            this.setViewport(this.width * this.dpr, this.height * this.dpr);
        } else {
            // bind supplied render target and update viewport
            this.bindFramebuffer(target);
            this.setViewport(target.width, target.height);
        }

        if (clear || (this.autoClear && clear !== false)) {
            // Ensure depth buffer writing is enabled so it can be cleared
            if (this.depth && (!target || target.depth)) {
                this.enable(this.gl.DEPTH_TEST);
                this.setDepthMask(true);
            }

            // Same for stencil
            if (this.stencil || !target || target.stencil) {
                this.enable(this.gl.STENCIL_TEST);
                this.setStencilMask(0xff);
            }

            this.gl.clear(
                (this.color ? this.gl.COLOR_BUFFER_BIT : 0) |
                    (this.depth ? this.gl.DEPTH_BUFFER_BIT : 0) |
                    (this.stencil ? this.gl.STENCIL_BUFFER_BIT : 0)
            );
        }

        // updates all scene graph matrices
        if (update) scene.updateMatrixWorld();

        // Update camera separately, in case not in scene graph
        if (camera) camera.updateMatrixWorld();

        // Get render list - entails culling and sorting
        const renderList = this.getRenderList({ scene, camera, frustumCull, sort });

        renderList.forEach((node: any) => {
            node.draw({ camera });
        });
    }
}