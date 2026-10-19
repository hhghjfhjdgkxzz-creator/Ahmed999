import protobuf from 'protobufjs';

export const SVGA_PROTO_SCHEMA = {
  nested: {
    com: {
      nested: {
        opensource: {
          nested: {
            svga: {
              nested: {
                MovieParams: {
                  fields: {
                    viewBoxWidth: { type: 'float', id: 1 },
                    viewBoxHeight: { type: 'float', id: 2 },
                    fps: { type: 'int32', id: 3 },
                    frames: { type: 'int32', id: 4 }
                  }
                },
                Layout: {
                  fields: {
                    x: { type: 'float', id: 1 },
                    y: { type: 'float', id: 2 },
                    width: { type: 'float', id: 3 },
                    height: { type: 'float', id: 4 }
                  }
                },
                Transform: {
                  fields: {
                    a: { type: 'float', id: 1 },
                    b: { type: 'float', id: 2 },
                    c: { type: 'float', id: 3 },
                    d: { type: 'float', id: 4 },
                    tx: { type: 'float', id: 5 },
                    ty: { type: 'float', id: 6 }
                  }
                },
                ShapeEntity: {
                  fields: {
                    type: { type: 'int32', id: 1 }
                  }
                },
                FrameEntity: {
                  fields: {
                    alpha: { type: 'float', id: 1 },
                    layout: { type: 'Layout', id: 2 },
                    transform: { type: 'Transform', id: 3 },
                    clipPath: { type: 'string', id: 4 },
                    shapes: { rule: 'repeated', type: 'ShapeEntity', id: 5 }
                  }
                },
                SpriteEntity: {
                  fields: {
                    imageKey: { type: 'string', id: 1 },
                    frames: { rule: 'repeated', type: 'FrameEntity', id: 2 },
                    matteKey: { type: 'string', id: 3 }
                  }
                },
                AudioEntity: {
                  fields: {
                    audioKey: { type: 'string', id: 1 },
                    startFrame: { type: 'int32', id: 2 },
                    endFrame: { type: 'int32', id: 3 },
                    startTime: { type: 'int32', id: 4 },
                    totalTime: { type: 'int32', id: 5 }
                  }
                },
                MovieEntity: {
                  fields: {
                    version: { type: 'string', id: 1 },
                    params: { type: 'MovieParams', id: 2 },
                    images: { keyType: 'string', type: 'bytes', id: 3 },
                    sprites: { rule: 'repeated', type: 'SpriteEntity', id: 4 },
                    audios: { rule: 'repeated', type: 'AudioEntity', id: 5 }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

let cachedMovieEntityType: protobuf.Type | null = null;

export function getMovieEntityType(): protobuf.Type {
  if (!cachedMovieEntityType) {
    const root = protobuf.Root.fromJSON(SVGA_PROTO_SCHEMA);
    cachedMovieEntityType = root.lookupType('com.opensource.svga.MovieEntity');
  }
  return cachedMovieEntityType;
}
