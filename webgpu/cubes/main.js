window.addEventListener("DOMContentLoaded", async () => {
  if (!navigator.gpu) throw new Error("WebGPU not supported.");

  // Можете збільшувати кількість (наприклад, 5000 чи 10000)
  const totalCubes = 5000;

  document.getElementById("cubes-val").innerText =
    totalCubes.toLocaleString("uk-UA");

  const canvas = document.getElementById("gpuCanvas");
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  // 1. ШЕЙДЕР З ХАОТИЧНИМ 3D ОБЕРТАННЯМ НАВКОЛО ТРЬОХ ОСЕЙ (WGSL)
  const shaderCode = `
    struct FrameData {
        viewProjMatrix: mat4x4<f32>,
        time: f32,
        width: f32,
        height: f32,
        padding: f32,
    };

    @group(0) @binding(0) var<uniform> frameData : FrameData;

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

    fn hash(n: f32) -> f32 {
        return fract(sin(n) * 43758.5453123);
    }

    // Створюємо повну матрицю обертання 4x4 навколо трьох осей (X, Y, Z) з різними знаками
    fn createChaosRotationMatrix(ax: f32, ay: f32, az: f32) -> mat4x4<f32> {
        let cx = cos(ax); let sx = sin(ax);
        let cy = cos(ay); let sy = sin(ay);
        let cz = cos(az); let sz = sin(az);

        // Перемножені матриці обертання Rx * Ry * Rz в одну результуючу матрицю
        return mat4x4<f32>(
            vec4<f32>(cy * cz, cz * sx * sy - cx * sz, cx * cz * sy + sx * sz, 0.0),
            vec4<f32>(cy * sz, cx * cz + sx * sy * sz, -cz * sx + cx * sy * sz, 0.0),
            vec4<f32>(-sy, cy * sx, cx * cy, 0.0),
            vec4<f32>(0.0, 0.0, 0.0, 1.0)
        );
    }

    @vertex
    fn vs_main(
        input: VertexInput,
        @builtin(instance_index) instanceIndex: u32
    ) -> VertexOutput {
        let idx = f32(instanceIndex);
        
        // Генерація унікального хаосу для кожного кубика
        let rand1 = hash(idx * 0.17);
        let rand2 = hash(idx * 0.31);
        let rand3 = hash(idx * 0.43);
        let rand4 = hash(idx * 0.59);

        // 1. Рух по орбіті кільця
        let orbitAngle = rand1 * 6.28318 + frameData.time * 0.00015 * (0.5 + rand2);
        let radius = 1.3 + rand2 * 1.7;
        
        let cubeCenterX = cos(orbitAngle) * radius;
        let cubeCenterY = (rand3 - 0.5) * 0.5;
        let cubeCenterZ = sin(orbitAngle) * radius - 4.0; // Хмара відсунута назад

        // 2. ХАОТИЧНЕ ОБЕРТАННЯ: Кожна вісь отримує свій унікальний напрямок, знак і швидкість!
        // Напрямок (вперед чи назад) визначається виразом (rand * 2.0 - 1.0)
        let dirX = rand1 * 2.0 - 1.0;
        let dirY = rand2 * 2.0 - 1.0;
        let dirZ = rand3 * 2.0 - 1.0;

        let rotX = frameData.time * 0.0012 * (0.3 + rand4) * dirX;
        let rotY = frameData.time * 0.0009 * (0.3 + rand1) * dirY;
        let rotZ = frameData.time * 0.0015 * (0.3 + rand2) * dirZ;
        
        // Генеруємо хаотичну матрицю повороту для цього куба
        let modelMatrix = createChaosRotationMatrix(rotX, rotY, rotZ);

        // 3. Індивідуальний розмір
        let scale = 0.04 + rand4 * 0.09;
        let scaledPosition = input.position * scale;

        // Збираємо трансформацію
        let rotatedPos = (modelMatrix * vec4<f32>(scaledPosition, 1.0)).xyz;
        let worldPosition = rotatedPos + vec3<f32>(cubeCenterX, cubeCenterY, cubeCenterZ);

        // Колір куба (залежить від його положення та індексу)
        let r = sin(rand2 * 4.0 + frameData.time * 0.0005) * 0.3 + 0.7;
        let g = cos(rand1 * 2.0) * 0.3 + 0.5;
        let b = sin(rand3 * 6.0) * 0.2 + 0.8;

        var output: VertexOutput;
        output.position = frameData.viewProjMatrix * vec4<f32>(worldPosition, 1.0);
        output.normal = (modelMatrix * vec4<f32>(input.normal, 0.0)).xyz;
        output.color = vec3<f32>(r, g, b);
        return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        let lightDirection = normalize(vec3<f32>(0.4, 1.0, 0.6));
        let normal = normalize(input.normal);
        
        let diffuse = clamp(dot(normal, lightDirection), 0.0, 1.0);
        let ambient = 0.18; // Трохи яскравіше фонове світло
        
        let finalColor = input.color * (diffuse + ambient);
        return vec4<f32>(finalColor, 1.0);
    }
  `;

  // 2. ГЕОМЕТРІЯ КУБА
  const vertexData = new Float32Array([
    -0.5, -0.5, 0.5, 0.0, 0.0, 1.0, 1, 1, 1, 0.5, -0.5, 0.5, 0.0, 0.0, 1.0, 1,
    1, 1, 0.5, 0.5, 0.5, 0.0, 0.0, 1.0, 1, 1, 1, -0.5, 0.5, 0.5, 0.0, 0.0, 1.0,
    1, 1, 1, -0.5, -0.5, -0.5, 0.0, 0.0, -1.0, 1, 1, 1, -0.5, 0.5, -0.5, 0.0,
    0.0, -1.0, 1, 1, 1, 0.5, 0.5, -0.5, 0.0, 0.0, -1.0, 1, 1, 1, 0.5, -0.5,
    -0.5, 0.0, 0.0, -1.0, 1, 1, 1, -0.5, 0.5, -0.5, 0.0, 1.0, 0.0, 1, 1, 1,
    -0.5, 0.5, 0.5, 0.0, 1.0, 0.0, 1, 1, 1, 0.5, 0.5, 0.5, 0.0, 1.0, 0.0, 1, 1,
    1, 0.5, 0.5, -0.5, 0.0, 1.0, 0.0, 1, 1, 1, -0.5, -0.5, -0.5, 0.0, -1.0, 0.0,
    1, 1, 1, 0.5, -0.5, -0.5, 0.0, -1.0, 0.0, 1, 1, 1, 0.5, -0.5, 0.5, 0.0,
    -1.0, 0.0, 1, 1, 1, -0.5, -0.5, 0.5, 0.0, -1.0, 0.0, 1, 1, 1, 0.5, -0.5,
    -0.5, 1.0, 0.0, 0.0, 1, 1, 1, 0.5, 0.5, -0.5, 1.0, 0.0, 0.0, 1, 1, 1, 0.5,
    0.5, 0.5, 1.0, 0.0, 0.0, 1, 1, 1, 0.5, -0.5, 0.5, 1.0, 0.0, 0.0, 1, 1, 1,
    -0.5, -0.5, -0.5, -1.0, 0.0, 0.0, 1, 1, 1, -0.5, -0.5, 0.5, -1.0, 0.0, 0.0,
    1, 1, 1, -0.5, 0.5, 0.5, -1.0, 0.0, 0.0, 1, 1, 1, -0.5, 0.5, -0.5, -1.0,
    0.0, 0.0, 1, 1, 1,
  ]);

  const indexData = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14,
    15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(vertexData);
  vertexBuffer.unmap();

  const indexBuffer = device.createBuffer({
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  new Uint16Array(indexBuffer.getMappedRange()).set(indexData);
  indexBuffer.unmap();

  const uniformBuffer = device.createBuffer({
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformData = new Float32Array(20);

  const shaderModule = device.createShaderModule({ code: shaderCode });
  const depthTextureFormat = "depth24plus";

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 36,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 12, format: "float32x3" },
            { shaderLocation: 2, offset: 24, format: "float32x3" },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format: canvasFormat }],
    },
    primitive: { topology: "triangle-list", cullMode: "back" },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: depthTextureFormat,
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  let depthTexture = null;

  function getViewProjMatrix(width, height) {
    const aspect = width / height;
    const fov = (60 * Math.PI) / 180;
    const f = 1.0 / Math.tan(fov / 2);
    const near = 0.1,
      far = 20.0;
    const proj = new Float32Array(16);
    proj[0] = f / aspect;
    proj[5] = f;
    proj[10] = far / (near - far);
    proj[11] = -1.0;
    proj[14] = (far * near) / (near - far);
    return proj;
  }

  // Змінні для лічильника кадрів (Чесний FPS)
  let lastTime = performance.now();
  let frameCount = 0;
  const fpsSpan = document.getElementById("fps-val");

  // 3. ГОЛОВНИЙ ЦИКЛ АНІМАЦІЇ
  function render(timestamp) {
    // Рахуємо FPS
    frameCount++;
    const now = performance.now();
    if (now >= lastTime + 1000) {
      fpsSpan.innerText = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;
    }

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(canvas.clientWidth * dpr);
    const targetHeight = Math.floor(canvas.clientHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.configure({
        device: device,
        format: canvasFormat,
        alphaMode: "opaque",
      });

      if (depthTexture) depthTexture.destroy();
      depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: depthTextureFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    const viewProj = getViewProjMatrix(canvas.width, canvas.height);

    for (let i = 0; i < 16; i++) {
      uniformData[i] = viewProj[i];
    }
    uniformData[16] = timestamp;
    uniformData[17] = canvas.width;
    uniformData[18] = canvas.height;
    uniformData[19] = 0.0;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);

    const commandEncoder = device.createCommandEncoder();
    const renderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    renderPassEncoder.setPipeline(pipeline);

    renderPassEncoder.setBindGroup(0, bindGroup);
    renderPassEncoder.setVertexBuffer(0, vertexBuffer);
    renderPassEncoder.setIndexBuffer(indexBuffer, "uint16");
    renderPassEncoder.drawIndexed(36, totalCubes);
    renderPassEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
