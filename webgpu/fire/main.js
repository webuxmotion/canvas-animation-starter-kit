window.addEventListener("DOMContentLoaded", async () => {
  if (!navigator.gpu) throw new Error("WebGPU not supported.");

  const numParticles = 300000;

  const canvas = document.getElementById("gpuCanvas");
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  // ====== 1. ШЕЙДЕР СИСТЕМИ ЧАСТИНОК З ВІТРОМ ВІД МИШІ (WGSL) ======
  const shaderCode = `
    struct FrameData {
        width: f32,
        height: f32,
        time: f32,
        seed: f32,
        mouseX: f32,
        mouseY: f32,
        mouseDX: f32,
        mouseDY: f32,
    };

    struct Particle {
        pos: vec2<f32>,
        vel: vec2<f32>,
        life: f32,
        size: f32,
    };

    @group(0) @binding(0) var<uniform> frameDataCompute : FrameData;
    @group(0) @binding(1) var<storage, read_write> computeParticles : array<Particle>;

    @group(0) @binding(0) var<uniform> frameDataRender : FrameData;
    @group(0) @binding(2) var<storage, read> renderParticles : array<Particle>;

    fn hash(n: f32) -> f32 {
        return fract(sin(n) * 43758.5453123);
    }

    @compute @workgroup_size(256)
    fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
        let idx = id.x;
        if (idx >= u32(${numParticles})) { return; }

        var p = computeParticles[idx];
        let randId = f32(idx) + frameDataCompute.seed;

        p.life -= 0.012 * (hash(randId * 0.12) * 0.6 + 0.4);

        if (p.life <= 0.0) {
            p.life = 1.0;
            let angle = hash(randId * 0.45) * 6.28318;
            let radius = hash(randId * 0.78) * 60.0; 
            
            p.pos.x = (frameDataCompute.width / 2.0) + cos(angle) * radius;
            p.pos.y = frameDataCompute.height - 40.0;
            
            p.vel.x = (hash(randId * 0.23) - 0.5) * 1.5;
            p.vel.y = -(hash(randId * 0.56) * 3.5 + 2.0);
            p.size = hash(randId * 0.89) * 4.0 + 1.5;
        } else {
            // МАТЕМАТИКА ВІТРУ ВІД МИШІ
            let mousePos = vec2<f32>(frameDataCompute.mouseX, frameDataCompute.mouseY);
            let mouseVel = vec2<f32>(frameDataCompute.mouseDX, frameDataCompute.mouseDY);
            
            // Рахуємо вектор відстані від миші до іскри
            let toParticle = p.pos - mousePos;
            let dist = length(toParticle);
            
            // Радіус дії вітру (150 пікселів навколо курсора)
            const windRadius: f32 = 150.0;
            
            if (dist < windRadius && length(mouseVel) > 0.0) {
                // Сила вітру затухає в міру віддалення від курсора
                let force = (1.0 - (dist / windRadius)) * 0.25;
                // Штовхаємо частинку в напрямку руху миші
                p.vel += mouseVel * force;
            }

            // Рідна фізика багаття (рух вгору + тертя повітря)
            p.pos.x += p.vel.x + sin(frameDataCompute.time * 0.01 + p.pos.y * 0.02) * 0.4;
            p.pos.y += p.vel.y;
            
            // Уповільнення швидкості вітру з часом (тертя/затухання імпульсу)
            p.vel.x *= 0.98;
            
            let centerDist = p.pos.x - (frameDataCompute.width / 2.0);
            p.pos.x -= centerDist * 0.015; 
        }

        computeParticles[idx] = p;
    }

    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
    };

    @vertex
    fn vs_main(
        @builtin(vertex_index) vertexIndex: u32,
        @builtin(instance_index) instanceIndex: u32
    ) -> VertexOutput {
        let p = renderParticles[instanceIndex];
        
        var offsets = array<vec2<f32>, 4>(
            vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0),
            vec2<f32>(-1.0, 1.0),  vec2<f32>(1.0, 1.0)
        );
        var indices = array<u32, 6>(0, 1, 2, 2, 1, 3);
        
        let currentOffset = offsets[indices[vertexIndex]] * p.size * p.life;
        let pixelPos = p.pos + currentOffset;

        let ndcX = (pixelPos.x / frameDataRender.width) * 2.0 - 1.0;
        let ndcY = -((pixelPos.y / frameDataRender.height) * 2.0 - 1.0);

        var col = vec4<f32>(0.0);
        if (p.life > 0.6) {
            col = mix(vec4<f32>(1.0, 0.4, 0.0, p.life), vec4<f32>(1.0, 0.9, 0.2, p.life), (p.life - 0.6) / 0.4);
        } else {
            col = mix(vec4<f32>(0.3, 0.0, 0.0, 0.0), vec4<f32>(1.0, 0.4, 0.0, p.life), p.life / 0.6);
        }

        var output: VertexOutput;
        output.position = vec4<f32>(ndcX, ndcY, 0.0, 1.0);
        output.color = col;
        return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        return input.color;
    }
  `;

  const shaderModule = device.createShaderModule({ code: shaderCode });

  // ====== 2. МАКЕТИ ЗВ'ЯЗКІВ (8 чисел f32 = 32 байти для Uniform) ======
  const computeLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });

  const renderLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const uniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformData = new Float32Array(8); // Пам'ять під 8 значень f32

  const particleBufferSize = numParticles * 24;
  const particleBuffer = device.createBuffer({
    size: particleBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const initialData = new Float32Array(numParticles * 6);
  for (let i = 4; i < initialData.length; i += 6) {
    initialData[i] = -1.0;
  }
  device.queue.writeBuffer(particleBuffer, 0, initialData.buffer);

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: { module: shaderModule, entryPoint: "compute_main" },
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: shaderModule, entryPoint: "vs_main" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format: canvasFormat,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one",
              operation: "add",
            },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });

  const computeBindGroup = device.createBindGroup({
    layout: computeLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: particleBuffer } },
    ],
  });

  const renderBindGroup = device.createBindGroup({
    layout: renderLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 2, resource: { buffer: particleBuffer } },
    ],
  });

  // ====== 3. ОБРОБКА РУХУ МИШІ В JAVASCRIPT ======
  let mouseX = 0;
  let mouseY = 0;
  let mouseDX = 0;
  let mouseDY = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;

  window.addEventListener("mousemove", (e) => {
    const dpr = window.devicePixelRatio || 1;
    // Переводимо координати вікна у внутрішні пікселі Canvas Retina
    mouseX = e.clientX * dpr;
    mouseY = e.clientY * dpr;

    // Обчислюємо швидкість та напрямок руху руки (Дельта)
    mouseDX = mouseX - lastMouseX;
    mouseDY = mouseY - lastMouseY;

    lastMouseX = mouseX;
    lastMouseY = mouseY;
  });

  let lastTime = performance.now();
  let frameCount = 0;
  const fpsSpan = document.getElementById("fps-val");

  // ====== 4. ЦИКЛ ОБЧИСЛЕНЬ ======
  function render(timestamp) {
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
    }

    // Записуємо повну структуру в Uniform-буфер
    uniformData[0] = canvas.width;
    uniformData[1] = canvas.height;
    uniformData[2] = timestamp;
    uniformData[3] = Math.random();
    uniformData[4] = mouseX;
    uniformData[5] = mouseY;
    uniformData[6] = mouseDX;
    uniformData[7] = mouseDY;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);

    // Щоразу після відправки даних пригальмовуємо дельту швидкості миші,
    // щоб вітер плавно затухав, якщо ви зупинили руку
    mouseDX *= 0.85;
    mouseDY *= 0.85;

    // ЕТАП 1: Compute Pass
    const computeEncoder = device.createCommandEncoder();
    const computePass = computeEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(numParticles / 256));
    computePass.end();
    device.queue.submit([computeEncoder.finish()]);

    // ЕТАП 2: Render Pass
    const renderEncoder = device.createCommandEncoder();
    const renderPass = renderEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.01, g: 0.01, b: 0.015, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(6, numParticles);
    renderPass.end();
    device.queue.submit([renderEncoder.finish()]);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
});
