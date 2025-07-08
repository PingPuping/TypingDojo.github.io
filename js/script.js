// ตัวแปรเก็บคำศัพท์ที่โหลดจากไฟล์
let wordList = [];

// คำที่กำลังแสดงอยู่ในจอ
let activeWords = [];

// ภาษาเริ่มต้น
let language = 'eng';

// คะแนน, HP, เลเวล, EXP
let score = 0;
let hp = 5;
const maxHP = 5;
let level = 1;
let exp = 0;
const bonusChance = 0.1;   
const deadlyChance = 0.2;  

// ควบคุมความเร็วและความถี่ของเกม
let wordInterval = null;
let gameLoopInterval = null;
let isPaused = false;
let speed = 1;           // ความเร็วที่คำตก
let spawnRate = 5000;    // ความถี่การสร้างคำ (ms)

// DOM Elements ต่าง ๆ
const gameArea = document.getElementById("gameArea");
const wordInput = document.getElementById("wordInput");
const scoreBox = document.getElementById("scoreBox");
const levelBox = document.getElementById("levelBox");
const hpContainer = document.getElementById("hpContainer");
const startGameBtn = document.getElementById("startGameBtn");
const countdownEl = document.getElementById("countdown");

startGameBtn.addEventListener("click", () => {
  startCountdown();
});

// เมื่อผู้ใช้เปลี่ยนภาษา (Dropdown)
document.getElementById("languageSelect").addEventListener("change", (e) => {
  language = e.target.value;
  loadWords(); // โหลดคำใหม่ตามภาษา
});

// ปุ่มควบคุม
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("pauseBtn").addEventListener("click", pauseGame);
document.getElementById("submitBtn").addEventListener("click", submitWord);
wordInput.addEventListener("keydown", (e) => {
   if (e.code === "Space") {
    e.preventDefault(); // ป้องกัน Spacebar พิมพ์ช่องว่างใน input
    submitWord();
  }
});

// อัปเดตแถบ HP บนจอ
function updateHP() {
  hpContainer.innerHTML = "";
  for (let i = 0; i < hp; i++) {
    const hpBox = document.createElement("div");
    hpContainer.appendChild(hpBox);
  }
}

// อัปเดตคะแนนบนจอ
function updateScore() {
  scoreBox.textContent = `Score: ${score}`;
}

// อัปเดตเลเวลบนจอ
function updateLevel() {
  levelBox.textContent = `Level: ${level}`;
}

// เมื่อเลเวลเพิ่มขึ้น
function increaseLevel() {
  level++;
  speed += 0.5;                         // เพิ่มความเร็วคำตก
  spawnRate = Math.max(500, spawnRate - 150); // ลดเวลาสร้างคำ (เพิ่มความถี่)
  updateLevel();
  restartSpawnLoop();                   // รีเซ็ตตัวสร้างคำด้วยความถี่ใหม่
  console.log(`Level up! Now level = ${level}, speed = ${speed}, spawnRate = ${spawnRate} ms`);
}

// รีเซ็ต interval การสร้างคำใหม่ (ตาม spawnRate ปัจจุบัน)
function restartSpawnLoop() {
  clearInterval(wordInterval);
  wordInterval = setInterval(spawnWord, spawnRate);
}

// โหลดคำศัพท์จากไฟล์ JSON ตามภาษาที่เลือก
async function loadWords() {
  const res = await fetch(`${language}_word.json`);
  wordList = await res.json();
}

// ฟังก์ชันสร้างคำใหม่สุ่มขึ้นมาบนจอ
function spawnWord() {
  // สร้าง object คำปกติ
  const wordObj = {
    text: wordList[Math.floor(Math.random() * wordList.length)],
    x: Math.random() * (gameArea.clientWidth - 100),
    y: 0,
    speed: speed,
    isBonus: false,
    isDeadly: false
  };

  // สุ่มกำหนดให้เป็นโบนัส ถ้ายังไม่มีคำโบนัสอยู่บนจอ
  if (!activeWords.some(w => w.isBonus) && Math.random() < bonusChance) {
    wordObj.isBonus = true;
  }

  // สุ่มกำหนดให้เป็นห้ามพลาด ถ้ายังไม่มีคำห้ามพลาดอยู่บนจอ
  // และไม่ให้ซ้ำกับคำโบนัส
  if (!wordObj.isBonus && !activeWords.some(w => w.isDeadly) && Math.random() < deadlyChance) {
    wordObj.isDeadly = true;
  }

  activeWords.push(wordObj);
}

// แสดงคำทั้งหมดในหน้าจอ
function drawWords() {
  gameArea.innerHTML = ""; // เคลียร์จอ
  activeWords.forEach(word => {
    const el = document.createElement("div");
    el.textContent = word.text;
    el.className = "word";
    if (word.isBonus) el.classList.add("bonus");
    if (word.isDeadly) el.classList.add("deadly");
    el.style.left = `${word.x}px`;
    el.style.top = `${word.y}px`;
    gameArea.appendChild(el);
  });
}

// อัปเดตคำให้ตกลง + ตรวจว่าคำตกถึงล่างหรือยัง
function gameLoop() {
  if (isPaused) return; // ถ้าหยุดเกมอยู่ → ข้าม

  // คำตกลงตามความเร็ว
  activeWords.forEach(word => word.y += word.speed);

  // ตรวจคำที่ตกถึงล่างสุด
  activeWords = activeWords.filter(word => {
    if (word.y > gameArea.clientHeight) {
      if (word.isDeadly) {
        alert("Game Over! คุณพลาดคำอันตราย!");
        location.reload();
      }
      hp--;
      if (hp <= 0) {
        alert("Game Over!");
        location.reload();
      }
      updateHP();
      return false; // ลบออกจากจอ
    }
    return true;
  });

  drawWords(); // วาดคำทั้งหมดใหม่
}

// เมื่อนักเรียนพิมพ์คำและกด Enter
function submitWord() {
  const input = wordInput.value.trim();
  const index = activeWords.findIndex(w => w.text === input);

  if (index !== -1) {
    const matched = activeWords[index];

    // เพิ่มคะแนน + EXP
    score++;
    exp++;

    // ถ้าเป็นคำโบนัส → เพิ่ม HP (ถ้ายังไม่เต็ม)
    if (matched.isBonus && hp < maxHP) hp++;

    updateScore();
    updateHP();

    // ถ้า EXP ครบ 10 → เลเวลอัป
    if (exp >= 10) {
      exp = 0;
      increaseLevel();
    }

    // ลบคำออกจากจอ
    activeWords.splice(index, 1);
  }

  wordInput.value = "";
}

// เริ่มเกมใหม่ทั้งหมด
function startGame() {
  score = 0;
  hp = 5;
  level = 1;
  exp = 0;
  speed = 1;
  spawnRate = 5000;
  isPaused = false;

  updateScore();
  updateLevel();
  updateHP();

  console.log(`Start Game: speed = ${speed}, spawnRate = ${spawnRate} ms`); // 🔍 แสดงค่าตอนเริ่มเกม

  loadWords().then(() => {
    clearInterval(wordInterval);
    clearInterval(gameLoopInterval);
    wordInterval = setInterval(spawnWord, spawnRate); // สร้างคำ
    gameLoopInterval = setInterval(gameLoop, 50);     // คำตกลง
  });
}


// ฟังก์ชันแสดงตัวเลขนับถอยหลัง
function startCountdown() {
  let count = 3; // เริ่มที่ 3
  startGameBtn.style.display = "none"; // ซ่อนปุ่ม Start Game
  countdownEl.textContent = count;
  countdownEl.style.display = "block";

  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(countdownInterval);
      countdownEl.style.display = "none";
      startGame(); // เริ่มเกม
    }
  }, 1000);
}

// หยุดหรือเล่นต่อเกม
function pauseGame() {
  isPaused = !isPaused;
  document.getElementById("pauseBtn").textContent = isPaused ? "▶ Resume" : "⏸ Pause";
}
