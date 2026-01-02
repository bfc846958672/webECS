// TODO: delete texture
// TODO: use texSubImage2D for updates (video or when loaded)
// TODO: need? encoding = linearEncoding
// TODO: support non-compressed mipmaps uploads

const emptyPixel = new Uint8Array(4);

function isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
}

interface TextureOptions {
    image?: any;
    target?: GLenum;
    type?: GLenum;
    format?: GLenum;
    internalFormat?: GLenum;
    wrapS?: GLenum;
    wrapT?: GLenum;
    wrapR?: GLenum;
    generateMipmaps?: boolean;
    minFilter?: GLenum;
    magFilter?: GLenum;
    premultiplyAlpha?: boolean;
    unpackAlignment?: number;
    flipY?: boolean;
    anisotropy?: number;
    level?: number;
    width?: number;
    height?: number;
    length?: number;
}

interface TextureStore {
    image: any;
}

interface TextureState {
    minFilter: GLenum;
    magFilter: GLenum;
    wrapS: GLenum;
    wrapT: GLenum;
    wrapR?: GLenum;
    anisotropy: number;
}

let ID = 1;

export class Texture {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    id: number;
    image: any;
    target: GLenum;
    type: GLenum;
    format: GLenum;
    internalFormat: GLenum;
    minFilter: GLenum;
    magFilter: GLenum;
    wrapS: GLenum;
    wrapT: GLenum;
    wrapR: GLenum;
    generateMipmaps: boolean;
    premultiplyAlpha: boolean;
    unpackAlignment: number;
    flipY: boolean;
    anisotropy: number;
    level: number;
    width?: number;
    height?: number;
    length: number;
    texture: WebGLTexture;
    store: TextureStore;
    glState: any;
    state: TextureState;
    needsUpdate?: boolean;
    onUpdate?: () => void;

    constructor(
        gl: WebGLRenderingContext | WebGL2RenderingContext,
        {
            image,
            target = gl.TEXTURE_2D,
            type = gl.UNSIGNED_BYTE,
            format = gl.RGBA,
            internalFormat = format,
            wrapS = gl.CLAMP_TO_EDGE,
            wrapT = gl.CLAMP_TO_EDGE,
            wrapR = gl.CLAMP_TO_EDGE,
            generateMipmaps = target === (gl.TEXTURE_2D || gl.TEXTURE_CUBE_MAP),
            minFilter = generateMipmaps ? gl.NEAREST_MIPMAP_LINEAR : gl.LINEAR,
            magFilter = gl.LINEAR,
            premultiplyAlpha = false,
            unpackAlignment = 4,
            flipY = target == gl.TEXTURE_2D || target == (gl as WebGL2RenderingContext).TEXTURE_3D ? true : false,
            anisotropy = 0,
            level = 0,
            width, // used for RenderTargets or Data Textures
            height = width,
            length = 1,
        }: TextureOptions = {}
    ) {
        this.gl = gl;
        this.id = ID++;

        this.image = image;
        this.target = target;
        this.type = type;
        this.format = format;
        this.internalFormat = internalFormat;
        this.minFilter = minFilter;
        this.magFilter = magFilter;
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.wrapR = wrapR;
        this.generateMipmaps = generateMipmaps;
        this.premultiplyAlpha = premultiplyAlpha;
        this.unpackAlignment = unpackAlignment;
        this.flipY = flipY;
        this.anisotropy = Math.min(anisotropy, (this.gl as any).renderer.parameters.maxAnisotropy);
        this.level = level;
        this.width = width;
        this.height = height;
        this.length = length;
        this.texture = this.gl.createTexture() as WebGLTexture;

        this.store = {
            image: null,
        };

        // Alias for state store to avoid redundant calls for global state
        this.glState = (this.gl as any).renderer.state;

        // State store to avoid redundant calls for per-texture state
        this.state = {
            minFilter: gl.NEAREST_MIPMAP_LINEAR,
            magFilter: gl.LINEAR,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT,
            wrapR: gl.REPEAT,
            anisotropy: 0,
        };
    }

    bind(): void {
        // Already bound to active texture unit
        if ((this.glState as any).textureUnits[(this.glState as any).activeTextureUnit] === this.id) return;
        this.gl.bindTexture(this.target, this.texture);
        (this.glState as any).textureUnits[(this.glState as any).activeTextureUnit] = this.id;
    }

    update(textureUnit: number = 0): void {
        const needsUpdate = !(this.image === this.store.image && !this.needsUpdate);

        // Make sure that texture is bound to its texture unit
        if (needsUpdate || (this.glState as any).textureUnits[textureUnit] !== this.id) {
            // set active texture unit to perform texture functions
            (this.gl as any).renderer.activeTexture(textureUnit);
            this.bind();
        }

        if (!needsUpdate) return;
        this.needsUpdate = false;

        if (this.flipY !== (this.glState as any).flipY) {
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
            (this.glState as any).flipY = this.flipY;
        }

        if (this.premultiplyAlpha !== (this.glState as any).premultiplyAlpha) {
            this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
            (this.glState as any).premultiplyAlpha = this.premultiplyAlpha;
        }

        if (this.unpackAlignment !== (this.glState as any).unpackAlignment) {
            this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, this.unpackAlignment);
            (this.glState as any).unpackAlignment = this.unpackAlignment;
        }

        if (this.minFilter !== this.state.minFilter) {
            this.gl.texParameteri(this.target, this.gl.TEXTURE_MIN_FILTER, this.minFilter);
            this.state.minFilter = this.minFilter;
        }

        if (this.magFilter !== this.state.magFilter) {
            this.gl.texParameteri(this.target, this.gl.TEXTURE_MAG_FILTER, this.magFilter);
            this.state.magFilter = this.magFilter;
        }

        if (this.wrapS !== this.state.wrapS) {
            this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_S, this.wrapS);
            this.state.wrapS = this.wrapS;
        }

        if (this.wrapT !== this.state.wrapT) {
            this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_T, this.wrapT);
            this.state.wrapT = this.wrapT;
        }

        if (this.wrapR !== this.state.wrapR) {
            this.gl.texParameteri(this.target, (this.gl as WebGL2RenderingContext).TEXTURE_WRAP_R, this.wrapR);
            this.state.wrapR = this.wrapR;
        }

        if (this.anisotropy && this.anisotropy !== this.state.anisotropy) {
            this.gl.texParameterf(
                this.target, 
                (this.gl as any).renderer.getExtension('EXT_texture_filter_anisotropic').TEXTURE_MAX_ANISOTROPY_EXT, 
                this.anisotropy
            );
            this.state.anisotropy = this.anisotropy;
        }

        if (this.image) {
            if (this.image.width) {
                this.width = this.image.width;
                this.height = this.image.height;
            }

            if (this.target === this.gl.TEXTURE_CUBE_MAP) {
                // For cube maps
                for (let i = 0; i < 6; i++) {
                    this.gl.texImage2D(
                        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 
                        this.level, 
                        this.internalFormat, 
                        this.format, 
                        this.type, 
                        this.image[i]
                    );
                }
            } else if (ArrayBuffer.isView(this.image)) {
                // Data texture
                if (this.target === this.gl.TEXTURE_2D) {
                    this.gl.texImage2D(
                        this.target, 
                        this.level, 
                        this.internalFormat, 
                        this.width as number, 
                        this.height as number, 
                        0, 
                        this.format, 
                        this.type, 
                        this.image
                    );
                } else if (this.target === (this.gl as WebGL2RenderingContext).TEXTURE_2D_ARRAY || this.target === (this.gl as WebGL2RenderingContext).TEXTURE_3D) {
                    (this.gl as WebGL2RenderingContext).texImage3D(
                        this.target, 
                        this.level, 
                        this.internalFormat, 
                        this.width as number, 
                        this.height as number, 
                        this.length, 
                        0, 
                        this.format, 
                        this.type, 
                        this.image
                    );
                }
            } else if ((this.image as any).isCompressedTexture) {
                // Compressed texture
                for (let level = 0; level < (this.image as any[]).length; level++) {
                    this.gl.compressedTexImage2D(
                        this.target, 
                        level, 
                        this.internalFormat, 
                        (this.image as any[])[level].width, 
                        (this.image as any[])[level].height, 
                        0, 
                        (this.image as any[])[level].data
                    );
                }
            } else {
                // Regular texture
                if (this.target === this.gl.TEXTURE_2D) {
                    this.gl.texImage2D(
                        this.target, 
                        this.level, 
                        this.internalFormat, 
                        this.format, 
                        this.type, 
                        this.image
                    );
                } else {
                    (this.gl as WebGL2RenderingContext).texImage3D(
                        this.target, 
                        this.level, 
                        this.internalFormat, 
                        this.width as number, 
                        this.height as number, 
                        this.length, 
                        0, 
                        this.format, 
                        this.type, 
                        this.image
                    );
                }
            }

            if (this.generateMipmaps) {
                // For WebGL1, if not a power of 2, turn off mips, set wrapping to clamp to edge and minFilter to linear
                if (!(this.gl as any).renderer.isWebgl2 && (!isPowerOf2(this.image.width) || !isPowerOf2(this.image.height))) {
                    this.generateMipmaps = false;
                    this.wrapS = this.wrapT = this.gl.CLAMP_TO_EDGE;
                    this.minFilter = this.gl.LINEAR;
                } else {
                    this.gl.generateMipmap(this.target);
                }
            }

            // Callback for when data is pushed to GPU
            this.onUpdate && this.onUpdate();
        } else {
            if (this.target === this.gl.TEXTURE_CUBE_MAP) {
                // Upload empty pixel for each side while no image to avoid errors while image or video loading
                for (let i = 0; i < 6; i++) {
                    this.gl.texImage2D(
                        this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 
                        0, 
                        this.gl.RGBA, 
                        1, 
                        1, 
                        0, 
                        this.gl.RGBA, 
                        this.gl.UNSIGNED_BYTE, 
                        emptyPixel
                    );
                }
            } else if (this.width) {
                // image intentionally left null for RenderTarget
                if (this.target === this.gl.TEXTURE_2D) {
                    this.gl.texImage2D(
                        this.target, 
                        this.level, 
                        this.internalFormat, 
                        this.width, 
                        this.height as number, 
                        0, 
                        this.format, 
                        this.type, 
                        null
                    );
                } else {
                    (this.gl as WebGL2RenderingContext).texImage3D(
                        this.target, 
                        this.level, 
                        this.internalFormat, 
                        this.width, 
                        this.height as number, 
                        this.length, 
                        0, 
                        this.format, 
                        this.type, 
                        null
                    );
                }
            } else {
                // Upload empty pixel if no image to avoid errors while image or video loading
                this.gl.texImage2D(
                    this.target, 
                    0, 
                    this.gl.RGBA, 
                    1, 
                    1, 
                    0, 
                    this.gl.RGBA, 
                    this.gl.UNSIGNED_BYTE, 
                    emptyPixel
                );
            }
        }
        this.store.image = this.image;
    }
}