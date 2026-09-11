import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";

console.log("Доступні моделі:", prebuiltAppConfig.model_list.map(m => m.model_id));

window.addEventListener('DOMContentLoaded', () => {
    const selectedModel = "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC";
    let engine;
    let isVisualAborted = false; // Візуальний прапорець зупинки

    let chatHistory = [
        { role: "system", content: "You are a helpful AI assistant. Help me to learn webgpu and math for computer graphics" }
    ];

    const downloadBtn = document.getElementById("download-btn");
    const sendBtn = document.getElementById("send-btn");
    const abortBtn = document.getElementById("abort-btn"); 
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const statusDiv = document.getElementById("status");

    const scrollToBottom = () => { chatBox.scrollTop = chatBox.scrollHeight; };

    downloadBtn.onclick = async () => {
        downloadBtn.disabled = true;
        statusDiv.innerText = "Ініціалізація WebGPU двигуна...";
        try {
            if (!navigator.gpu) throw new Error("WebGPU не підтримується!");
            engine = await CreateMLCEngine(selectedModel, {
                initProgressCallback: (report) => { statusDiv.innerText = `Прогрес: ${report.text}`; }
            });
            statusDiv.innerText = "Модель готова!";
            userInput.disabled = false;
            sendBtn.disabled = false;
        } catch (error) {
            statusDiv.innerText = `Помилка: ${error.message}`;
            downloadBtn.disabled = false;
        }
    };

    const sendMessage = async () => {
        const text = userInput.value.trim();
        if (!text) return;

        isVisualAborted = false; // Скидаємо прапорець перед новим повідомленням

        userInput.disabled = true;
        sendBtn.disabled = true;
        if (abortBtn) abortBtn.style.display = "inline-block"; 
        userInput.value = "";

        chatBox.innerHTML += `<div class="message user-msg">${text}</div>`;
        chatHistory.push({ role: "user", content: text });
        scrollToBottom();

        const aiMessageDiv = document.createElement("div");
        aiMessageDiv.className = "message ai-msg";
        aiMessageDiv.innerText = "Думаю...";
        chatBox.appendChild(aiMessageDiv);
        scrollToBottom();

        try {
            statusDiv.innerText = "Генерація відповіді на GPU...";
            
            const reply = await engine.chat.completions.create({
                messages: chatHistory,
                stream: true
            });

            aiMessageDiv.innerText = "";
            let fullAiResponse = "";

            for await (const chunk of reply) {
                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                    const delta = chunk.choices[0].delta.content || "";
                    fullAiResponse += delta;
                    
                    // Якщо користувач натиснув стоп — МИ ПРИПИНЯЄМО ОНОВЛЮВАТИ ЕКРАН
                    if (!isVisualAborted) {
                        aiMessageDiv.innerText = fullAiResponse;
                        scrollToBottom();
                    }
                }
            }

            // Записуємо фінальний текст в історію розмови
            chatHistory.push({ role: "assistant", content: fullAiResponse });
            
            if (!isVisualAborted) {
                statusDiv.innerText = "Модель готова до наступного запитання.";
            }
        } catch (error) {
            if (!isVisualAborted) {
                aiMessageDiv.innerText = `Помилка: ${error.message}`;
            }
            console.error(error);
        }
    };

    if (abortBtn) {
        abortBtn.onclick = () => {
            isVisualAborted = true; // Миттєво вимикаємо рендеринг тексту на екрані
            
            // Наочно показуємо користувачу, що ми його почули
            const activeAiMessage = chatBox.querySelector(".ai-msg:last-child");
            if (activeAiMessage && activeAiMessage.innerText === "Думаю...") {
                activeAiMessage.innerText = "[Генерацію скасовано на початку]";
            } else if (activeAiMessage) {
                activeAiMessage.innerText += "\n\n⏱️ [Генерацію зупинено користувачем]";
            }

            statusDiv.innerText = "Генерацію приховано. Інтерфейс вільний.";
            
            // МИТТЄВО розблоковуємо інтерфейс для користувача, не чекаючи на заклинений WebGPU потік
            userInput.disabled = false;
            sendBtn.disabled = false;
            abortBtn.style.display = "none";
            userInput.focus();
            scrollToBottom();
            
            // Посилаємо фоновий сигнал на зменшення генерації, якщо воно колись пройде
            if (engine) engine.interruptGenerate(); 
        };
    };

    sendBtn.onclick = sendMessage;
    userInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
});
