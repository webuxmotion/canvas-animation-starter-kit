window.addEventListener("DOMContentLoaded", async () => {
  if (!navigator.gpu) throw new Error("WebGPU not supported.");

  // Залишаємо ваші стабільні 5000 кубів для тесту бліків
  const totalCubes = 5000;

  document.getElementById("cubes-val").innerText =
    totalCubes.toLocaleString("uk-UA");

  const canvas = document.getElementById("gpuCanvas");
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  // 1. ШЕЙДЕР З ПОВНОЮ МАТЕМАТИКОЮ ОСВІТЛЕННЯ ФОНГА (WGSL)
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
        @location(0) worldPosition: vec3<f32>, // Передаємо позицію у світ для розрахунку бліку
        @location(1) normal: vec3<f32>,
        @location(2) color: vec3<f32>,
    };

    fn hash(n: f32) -> f32 {
        return fract(sin(n) * 43758.5453123);
    }

    fn createChaosRotationMatrix(ax: f32, ay: f32, az: f32) -> mat4x4<f32> {
        let cx = cos(ax); let sx = sin(ax);
        let cy = cos(ay); let sy = sin(ay);
        let cz = cos(az); let sz = sin(az);
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
        
        let rand1 = hash(idx * 0.17);
        let rand2 = hash(idx * 0.31);
        let rand3 = hash(idx * 0.43);
        let rand4 = hash(idx * 0.59);

        // Рух по орбіті кільця
        let orbitAngle = rand1 * 6.28318 + frameData.time * 0.00012 * (0.5 + rand2);
        let radius = 1.3 + rand2 * 1.7;
        
        let cubeCenterX = cos(orbitAngle) * radius;
        let cubeCenterY = (rand3 - 0.5) * 0.6;
        let cubeCenterZ = sin(orbitAngle) * radius - 3.8; 

        // Хаотичне обертання
        let dirX = rand1 * 2.0 - 1.0;
        let dirY = rand2 * 2.0 - 1.0;
        let dirZ = rand3 * 2.0 - 1.0;

        let rotX = frameData.time * 0.0010 * (0.3 + rand4) * dirX;
        let rotY = frameData.time * 0.0008 * (0.3 + rand1) * dirY;
        let rotZ = frameData.time * 0.0013 * (0.3 + rand2) * dirZ;
        let modelMatrix = createChaosRotationMatrix(rotX, rotY, rotZ);

        let scale = 0.05 + rand4 * 0.08;
        let scaledPosition = input.position * scale;

        let rotatedPos = (modelMatrix * vec4<f32>(scaledPosition, 1.0)).xyz;
        let worldPos = rotatedPos + vec3<f32>(cubeCenterX, cubeCenterY, cubeCenterZ);

        // Матові насичені кольори, на яких бліки видно найкраще
        let r = sin(rand2 * 3.5) * 0.4 + 0.5;
        let g = cos(rand1 * 1.5) * 0.4 + 0.4;
        let b = sin(rand3 * 5.0) * 0.2 + 0.7;

        var output: VertexOutput;
        output.position = frameData.viewProjMatrix * vec4<f32>(worldPos, 1.0);
        output.worldPosition = worldPos; 
        output.normal = (modelMatrix * vec4<f32>(input.normal, 0.0)).xyz;
        output.color = vec3<f32>(r, g, b);
        return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        // Напрямок світла та позиція нашої камери (ока) у просторі
        let lightDirection = normalize(vec3<f32>(0.5, 1.0, 0.6));
        let cameraPosition = vec3<f32>(0.0, 0.0, 0.0); // Камера стоїть в нулі координатної сітки
        
        let normal = normalize(input.normal);
        
        // 1. АМБІЄНТНЕ ОСВІТЛЕННЯ (М'яке фонове світло)
        let ambientIntensity = 0.12;
        let ambient = ambientIntensity * input.color;
        
        // 2. ДИФУЗНЕ ОСВІТЛЕННЯ (Базова матова яскравість граней Ламберта)
        let diffuseFactor = clamp(dot(normal, lightDirection), 0.0, 1.0);
        let diffuse = diffuseFactor * input.color;
        
        // 3. ДЗЕРКАЛЬНИЙ БЛІК ФОНГА (Specular Highlight)
        // Обчислюємо вектор погляду від вершини до камери
        let viewDirection = normalize(cameraPosition - input.worldPosition);
        
        // Знаходимо вектор ідеального відбиття світла від поверхні грані куба
        // Вбудована функція reflect потребує вхідного вектора від джерела, тому інвертуємо lightDirection
        let reflectDirection = reflect(-lightDirection, normal);
        
        // Рахуємо косинус кута між вектором погляду та вектором відбиття променя
        let specularFactor = clamp(dot(viewDirection, reflectDirection), 0.0, 1.0);
        
        // Підносимо косинус до великого ступеня (Shininess). Чим більша цифра — тим менший і гостріший глянцевий блік.
        // pow(specularFactor, 32.0) робить поверхню схожою на гладкий глянець
        let shininess = 32.0;
        const specularColor = vec3<f32>(1.0, 1.0, 1.0); // Блік завжди чисто білого кольору, як відблиск сонця
        let specular = pow(specularFactor, shininess) * specularColor * 0.6; // 0.6 — сила бліку
        
        // Фінальний колір пікселя — це сума всіх трьох компонентів світла Фонга
        let finalColor = ambient + diffuse + specular;
        
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

  let lastTime = performance.now();
  let frameCount = 0;
  const fpsSpan = document.getElementById("fps-val");

  // 3. ЦИКЛ АНІМАЦІЇ ТА ВИВЕДЕННЯ БЛІКІВ
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
