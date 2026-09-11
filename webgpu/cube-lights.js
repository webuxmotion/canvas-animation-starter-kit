window.addEventListener('DOMContentLoaded', async () => {
  if (!navigator.gpu) throw new Error("WebGPU not supported.");

  const canvas = document.getElementById("gpuCanvas");
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  // 1. ШЕЙДЕР З РОЗРАХУНКОМ ОСВІТЛЕННЯ (WGSL)
  const shaderCode = `
    struct Uniforms {
        mvpMatrix: mat4x4<f32>,
        modelMatrix: mat4x4<f32>,
    };

    @group(0) @binding(0) var<uniform> uniforms : Uniforms;

    struct VertexInput {
        @location(0) position: vec3<f32>,
        @location(1) normal: vec3<f32>,  
        @location(2) color: vec3<f32>,
    };

    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) normal: vec3<f32>,
        @location(1) color: vec3<f32>,
    };

    @vertex
    fn vs_main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        output.position = uniforms.mvpMatrix * vec4<f32>(input.position, 1.0);
        output.normal = (uniforms.modelMatrix * vec4<f32>(input.normal, 0.0)).xyz;
        output.color = input.color;
        return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        let lightDirection = normalize(vec3<f32>(0.5, 1.0, 0.8));
        let normal = normalize(input.normal);
        let diffuse = clamp(dot(normal, lightDirection), 0.0, 1.0);
        let ambient = 0.15;
        let lightIntensity = diffuse + ambient;
        let finalColor = input.color * lightIntensity;
        return vec4<f32>(finalColor, 1.0);
    }
  `;

  // 2. ГЕОМЕТРІЯ КУБА: Позиція (3), Нормаль (3), Колір (3)
  const vertexData = new Float32Array([
    // Передня грань
    -0.5, -0.5,  0.5,      0.0,  0.0,  1.0,      0.9, 0.1, 0.1,
     0.5, -0.5,  0.5,      0.0,  0.0,  1.0,      0.9, 0.1, 0.1,
     0.5,  0.5,  0.5,      0.0,  0.0,  1.0,      0.9, 0.1, 0.1,
    -0.5,  0.5,  0.5,      0.0,  0.0,  1.0,      0.9, 0.1, 0.1,

    // Задня грань
    -0.5, -0.5, -0.5,      0.0,  0.0, -1.0,      0.1, 0.8, 0.1,
    -0.5,  0.5, -0.5,      0.0,  0.0, -1.0,      0.1, 0.8, 0.1,
     0.5,  0.5, -0.5,      0.0,  0.0, -1.0,      0.1, 0.8, 0.1,
     0.5, -0.5, -0.5,      0.0,  0.0, -1.0,      0.1, 0.8, 0.1,

    // Верхня грань
    -0.5,  0.5, -0.5,      0.0,  1.0,  0.0,      0.1, 0.1, 0.9,
    -0.5,  0.5,  0.5,      0.0,  1.0,  0.0,      0.1, 0.1, 0.9,
     0.5,  0.5,  0.5,      0.0,  1.0,  0.0,      0.1, 0.1, 0.9,
     0.5,  0.5, -0.5,      0.0,  1.0,  0.0,      0.1, 0.1, 0.9,

    // Нижня грань
    -0.5, -0.5, -0.5,      0.0, -1.0,  0.0,      0.8, 0.8, 0.0,
     0.5, -0.5, -0.5,      0.0, -1.0,  0.0,      0.8, 0.8, 0.0,
     0.5, -0.5,  0.5,      0.0, -1.0,  0.0,      0.8, 0.8, 0.0,
    -0.5, -0.5,  0.5,      0.0, -1.0,  0.0,      0.8, 0.8, 0.0,

    // Права грань
     0.5, -0.5, -0.5,      1.0,  0.0,  0.0,      0.0, 0.8, 0.8,
     0.5,  0.5, -0.5,      1.0,  0.0,  0.0,      0.0, 0.8, 0.8,
     0.5,  0.5,  0.5,      1.0,  0.0,  0.0,      0.0, 0.8, 0.8,
     0.5, -0.5,  0.5,      1.0,  0.0,  0.0,      0.0, 0.8, 0.8,

    // Ліва грань
    -0.5, -0.5, -0.5,     -1.0,  0.0,  0.0,      0.8, 0.0, 0.8,
    -0.5, -0.5,  0.5,     -1.0,  0.0,  0.0,      0.8, 0.0, 0.8,
    -0.5,  0.5,  0.5,     -1.0,  0.0,  0.0,      0.8, 0.0, 0.8,
    -0.5,  0.5, -0.5,     -1.0,  0.0,  0.0,      0.8, 0.0, 0.8,
  ]);

  const indexData = new Uint16Array([
     0,  1,  2,   0,  2,  3, 
     4,  5,  6,   4,  6,  7, 
     8,  9, 10,   8, 10, 11, 
    12, 13, 14,  12, 14, 15, 
    16, 17, 18,  16, 18, 19, 
    20, 21, 22,  20, 22, 23, 
  ]);

  const vertexBuffer = device.createBuffer({ size: vertexData.byteLength, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
  new Float32Array(vertexBuffer.getMappedRange()).set(vertexData); vertexBuffer.unmap();

  const indexBuffer = device.createBuffer({ size: indexData.byteLength, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
  new Uint16Array(indexBuffer.getMappedRange()).set(indexData); indexBuffer.unmap();

  const uniformBuffer = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const shaderModule = device.createShaderModule({ code: shaderCode });
  const depthTextureFormat = "depth24plus";

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: 36, 
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x3" },  
          { shaderLocation: 1, offset: 12, format: "float32x3" }, 
          { shaderLocation: 2, offset: 24, format: "float32x3" }  
        ]
      }]
    },
    fragment: { module: shaderModule, entryPoint: "fs_main", targets: [{ format: canvasFormat }] },
    primitive: { topology: "triangle-list", cullMode: "back" },
    depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: depthTextureFormat }
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  let depthTexture = null;

  // 3. МАТЕМАТИКА ТРАНСФОРМАЦІЙ ТА МАТРИЦЬ 4x4
  function getMatrices(width, height, time) {
    const aspect = width / height;
    const fov = 60 * Math.PI / 180;
    const f = 1.0 / Math.tan(fov / 2);
    const near = 0.1, far = 10.0;
    const proj = new Float32Array(16);
    proj[0] = f / aspect; proj[5] = f; proj[10] = far / (near - far); proj[11] = -1.0; proj[14] = (far * near) / (near - far);

    const angleX = time * 0.0008;
    const angleY = time * 0.001;
    const cx = Math.cos(angleX), sx = Math.sin(angleX);
    const cy = Math.cos(angleY), sy = Math.sin(angleY);

    const model = new Float32Array(16);
    model[0] = cy;   model[1] = sy * sx;   model[2] = -sy * cx;  model[3] = 0;
    model[4] = 0;    model[5] = cx;        model[6] = sx;         model[7] = 0;
    model[8] = sy;   model[9] = -cy * sx;  model[10] = cy * cx;   model[11] = 0;
    model[12] = 0;   model[13] = 0;        model[14] = 0;         model[15] = 1;

    const mv = new Float32Array(model);
    mv[14] = -2.2; 

    const mvp = new Float32Array(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) { sum += proj[r + k * 4] * mv[k + c * 4]; }
        mvp[r + c * 4] = sum;
      }
    }
    return { mvp, model };
  }

  // 4. ГОЛОВНИЙ ЦИКЛ АНІМАЦІЇ
  function render(timestamp) {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(canvas.clientWidth * dpr);
    const targetHeight = Math.floor(canvas.clientHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth; canvas.height = targetHeight;
      context.configure({ device: device, format: canvasFormat, alphaMode: "opaque" });
      
      if (depthTexture) depthTexture.destroy();
      depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: depthTextureFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      });
    }

    const { mvp, model } = getMatrices(canvas.width, canvas.height, timestamp);
    
    device.queue.writeBuffer(uniformBuffer, 0, mvp.buffer);   
    device.queue.writeBuffer(uniformBuffer, 64, model.buffer); 

    const commandEncoder = device.createCommandEncoder();
    const renderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.04, g: 0.05, b: 0.07, a: 1.0 }, 
        loadOp: "clear",
        storeOp: "store"
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store"
      }
    });

    renderPassEncoder.setPipeline(pipeline);
    renderPassEncoder.setBindGroup(0, bindGroup);
    renderPassEncoder.setVertexBuffer(0, vertexBuffer);
    renderPassEncoder.setIndexBuffer(indexBuffer, "uint16");
    renderPassEncoder.drawIndexed(36);
    
    renderPassEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
});
