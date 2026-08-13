import { vehicleRepo, partRepo } from "./db.js";
import { jalaliToString } from "./core/jalali.js";
import { getPartStatus, STATUS } from "./core/calculations.js";
import { exportBackup, importBackup } from "./core/backup.js";
import { registerNotifications, checkAndNotify } from "./core/notifications.js";

// ---------- State ----------
let currentPin = null;
let pinBuffer = "";
let currentView = "vehicles";
let selectedVehicleId = null;

const PIN_KEY = "app_pin_hash";

// ---------- PIN Screen ----------
const pinScreen = document.getElementById("pin-screen");
const mainScreen = document.getElementById("main-screen");
const pinDots = document.getElementById("pin-dots").children;
const pinError = document.getElementById("pin-error");

async function hashPin(pin) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pin),
  );
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    pinDots[i].classList.toggle("filled", i < pinBuffer.length);
  }
}

async function submitPin() {
  const storedHash = localStorage.getItem(PIN_KEY);
  const enteredHash = await hashPin(pinBuffer);

  if (!storedHash) {
    // First-time setup
    localStorage.setItem(PIN_KEY, enteredHash);
    currentPin = pinBuffer;
    enterApp();
    return;
  }

  if (enteredHash === storedHash) {
    currentPin = pinBuffer;
    enterApp();
  } else {
    pinError.textContent = "کد PIN اشتباه است";
    pinBuffer = "";
    updatePinDots();
    setTimeout(() => (pinError.textContent = ""), 2000);
  }
}

document.querySelectorAll(".pin-btn[data-n]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (pinBuffer.length >= 4) return;
    pinBuffer += btn.dataset.n;
    updatePinDots();
    if (pinBuffer.length === 4) setTimeout(submitPin, 150);
  });
});

document.getElementById("pin-del").addEventListener("click", () => {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
});

document.getElementById("pin-clear").addEventListener("click", () => {
  pinBuffer = "";
  updatePinDots();
});

document.getElementById("setup-pin-link").addEventListener("click", () => {
  if (confirm("این کار PIN فعلی را حذف می‌کند. ادامه می‌دهید؟")) {
    localStorage.removeItem(PIN_KEY);
    pinBuffer = "";
    updatePinDots();
    pinError.textContent = "PIN جدید را وارد کنید";
    pinError.style.color = "green";
  }
});

function enterApp() {
  pinScreen.classList.remove("active");
  mainScreen.classList.add("active");
  registerNotifications().then(() => checkAndNotify());
  renderView("vehicles");
}

// ---------- Navigation ----------
const menuBtn = document.getElementById("menu-btn");
const sideMenu = document.getElementById("side-menu");
const closeMenu = document.getElementById("close-menu");
const headerTitle = document.getElementById("header-title");
const viewContainer = document.getElementById("view-container");
const addBtn = document.getElementById("add-btn");

menuBtn.addEventListener("click", () => sideMenu.classList.remove("hidden"));
closeMenu.addEventListener("click", () => sideMenu.classList.add("hidden"));

document.querySelectorAll("#side-menu a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    sideMenu.classList.add("hidden");
    renderView(a.dataset.view);
  });
});

const titles = {
  vehicles: "خودروهای من",
  parts: "قطعات",
  backup: "بک‌آپ",
  settings: "تنظیمات",
};

async function renderView(view) {
  currentView = view;
  headerTitle.textContent = titles[view] || "";
  addBtn.style.display =
    view === "vehicles" || view === "parts" ? "block" : "none";

  if (view === "vehicles") return renderVehicles();
  if (view === "parts") return renderParts();
  if (view === "backup") return renderBackup();
  if (view === "settings") return renderSettings();
}

// ---------- Vehicles View ----------
async function renderVehicles() {
  const vehicles = await vehicleRepo.getAll();
  viewContainer.innerHTML = `
    <div class="list">
      ${vehicles.length === 0 ? '<p class="empty">خودرویی ثبت نشده است</p>' : ""}
      ${vehicles
        .map(
          (v) => `
        <div class="card vehicle-card" data-id="${v.id}">
          <div class="card-title">🚗 ${v.name}</div>
          <div class="card-sub">کیلومتر فعلی: ${(v.currentKm || 0).toLocaleString("fa-IR")}</div>
          <div class="card-actions">
            <button class="btn-small view-parts" data-id="${v.id}">قطعات</button>
            <button class="btn-small edit-vehicle" data-id="${v.id}">ویرایش</button>
            <button class="btn-small danger delete-vehicle" data-id="${v.id}">حذف</button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  viewContainer.querySelectorAll(".view-parts").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedVehicleId = Number(btn.dataset.id);
      renderView("parts");
    }),
  );

  viewContainer
    .querySelectorAll(".edit-vehicle")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        openVehicleForm(Number(btn.dataset.id)),
      ),
    );

  viewContainer.querySelectorAll(".delete-vehicle").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (confirm("این خودرو و تمام قطعات آن حذف شود؟")) {
        await vehicleRepo.delete(Number(btn.dataset.id));
        renderVehicles();
      }
    }),
  );
}

addBtn.addEventListener("click", () => {
  if (currentView === "vehicles") openVehicleForm();
  else if (currentView === "parts") openPartForm();
});

function openVehicleForm(id = null) {
  const isEdit = id !== null;
  const promise = isEdit
    ? vehicleRepo.getAll().then((list) => list.find((v) => v.id === id))
    : Promise.resolve({});
  promise.then((v) => {
    viewContainer.innerHTML = `
      <form id="vehicle-form" class="form">
        <h3>${isEdit ? "ویرایش خودرو" : "خودروی جدید"}</h3>
        <label>نام خودرو</label>
        <input type="text" name="name" value="${v.name || ""}" required>
        <label>کیلومتر فعلی</label>
        <input type="number" name="currentKm" value="${v.currentKm || 0}" required>
        <div class="form-actions">
          <button type="submit" class="btn-primary">ذخیره</button>
          <button type="button" class="btn-secondary" id="cancel-form">انصراف</button>
        </div>
      </form>
    `;
    document
      .getElementById("cancel-form")
      .addEventListener("click", () => renderView("vehicles"));
    document
      .getElementById("vehicle-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
          name: fd.get("name"),
          currentKm: Number(fd.get("currentKm")),
        };
        if (isEdit) await vehicleRepo.update(id, data);
        else await vehicleRepo.add(data);
        renderView("vehicles");
      });
  });
}

// ---------- Parts View ----------
async function renderParts() {
  if (!selectedVehicleId) {
    const vehicles = await vehicleRepo.getAll();
    if (vehicles.length === 0) {
      viewContainer.innerHTML = '<p class="empty">ابتدا یک خودرو ثبت کنید</p>';
      return;
    }
    selectedVehicleId = vehicles[0].id;
  }

  const vehicle = (await vehicleRepo.getAll()).find(
    (v) => v.id === selectedVehicleId,
  );
  const parts = await partRepo.getByVehicle(selectedVehicleId);
  const vehicles = await vehicleRepo.getAll();

  const statusLabel = {
    [STATUS.OK]: "سالم",
    [STATUS.WARNING]: "نزدیک سررسید",
    [STATUS.OVERDUE]: "سررسید گذشته",
  };
  const statusClass = {
    [STATUS.OK]: "ok",
    [STATUS.WARNING]: "warning",
    [STATUS.OVERDUE]: "overdue",
  };

  viewContainer.innerHTML = `
    <select id="vehicle-select" class="vehicle-select">
      ${vehicles.map((v) => `<option value="${v.id}" ${v.id === selectedVehicleId ? "selected" : ""}>${v.name}</option>`).join("")}
    </select>
    <div class="list">
      ${parts.length === 0 ? '<p class="empty">قطعه‌ای ثبت نشده است</p>' : ""}
      ${parts
        .map((p) => {
          const { status } = getPartStatus(p, vehicle.currentKm || 0);
          return `
        <div class="card part-card status-${statusClass[status]}" data-id="${p.id}">
          <div class="card-title">🔧 ${p.name}</div>
          <div class="card-sub">آخرین تعویض: ${jalaliToString(new Date(p.lastDate))} — ${p.lastKm.toLocaleString("fa-IR")} کیلومتر</div>
          <div class="status-badge status-${statusClass[status]}">${statusLabel[status]}</div>
          <div class="card-actions">
            <button class="btn-small edit-part" data-id="${p.id}">ویرایش</button>
            <button class="btn-small danger delete-part" data-id="${p.id}">حذف</button>
          </div>
        </div>`;
        })
        .join("")}
    </div>
  `;

  document.getElementById("vehicle-select").addEventListener("change", (e) => {
    selectedVehicleId = Number(e.target.value);
    renderParts();
  });

  viewContainer
    .querySelectorAll(".edit-part")
    .forEach((btn) =>
      btn.addEventListener("click", () => openPartForm(Number(btn.dataset.id))),
    );

  viewContainer.querySelectorAll(".delete-part").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (confirm("این قطعه حذف شود؟")) {
        await partRepo.delete(Number(btn.dataset.id));
        renderParts();
      }
    }),
  );
}

function openPartForm(id = null) {
  const isEdit = id !== null;
  const promise = isEdit
    ? partRepo
        .getByVehicle(selectedVehicleId)
        .then((list) => list.find((p) => p.id === id))
    : Promise.resolve({});

  promise.then((p) => {
    viewContainer.innerHTML = `
      <form id="part-form" class="form">
        <h3>${isEdit ? "ویرایش قطعه" : "قطعه جدید"}</h3>
        <label>نام قطعه</label>
        <input type="text" name="name" value="${p.name || ""}" required placeholder="مثلاً روغن موتور">
        <label>کیلومتر آخرین تعویض</label>
        <input type="number" name="lastKm" value="${p.lastKm || 0}" required>
        <label>تاریخ آخرین تعویض</label>
        <input type="date" name="lastDate" value="${p.lastDate ? new Date(p.lastDate).toISOString().slice(0, 10) : ""}" required>
        <label>فاصله تعویض (کیلومتر)</label>
        <input type="number" name="intervalKm" value="${p.intervalKm || ""}" placeholder="مثلاً 5000">
        <label>فاصله تعویض (روز)</label>
        <input type="number" name="intervalDays" value="${p.intervalDays || ""}" placeholder="مثلاً 90">
        <div class="form-actions">
          <button type="submit" class="btn-primary">ذخیره</button>
          <button type="button" class="btn-secondary" id="cancel-form">انصراف</button>
        </div>
      </form>
    `;
    document
      .getElementById("cancel-form")
      .addEventListener("click", () => renderView("parts"));
    document
      .getElementById("part-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
          vehicleId: selectedVehicleId,
          name: fd.get("name"),
          lastKm: Number(fd.get("lastKm")),
          lastDate: new Date(fd.get("lastDate")).getTime(),
          intervalKm: fd.get("intervalKm")
            ? Number(fd.get("intervalKm"))
            : null,
          intervalDays: fd.get("intervalDays")
            ? Number(fd.get("intervalDays"))
            : null,
        };
        if (isEdit) await partRepo.update(id, data);
        else await partRepo.add(data);
        renderView("parts");
      });
  });
}

// ---------- Backup View ----------
function renderBackup() {
  viewContainer.innerHTML = `
    <div class="form">
      <h3>تهیه بک‌آپ</h3>
      <p class="hint">با کد PIN فعلی رمزنگاری و دانلود می‌شود.</p>
      <button class="btn-primary" id="export-btn">دانلود بک‌آپ</button>

      <h3 style="margin-top:24px">بازیابی بک‌آپ</h3>
      <input type="file" id="import-file" accept=".enc">
      <button class="btn-primary" id="import-btn" style="margin-top:8px">بازیابی</button>
      <p class="pin-error" id="backup-error"></p>
    </div>
  `;

  document.getElementById("export-btn").addEventListener("click", async () => {
    await exportBackup(currentPin);
  });

  document.getElementById("import-btn").addEventListener("click", async () => {
    const file = document.getElementById("import-file").files[0];
    const errEl = document.getElementById("backup-error");
    if (!file) {
      errEl.textContent = "ابتدا فایل را انتخاب کنید";
      return;
    }
    if (!confirm("اطلاعات فعلی جایگزین می‌شود. ادامه می‌دهید؟")) return;
    try {
      await importBackup(file, currentPin);
      alert("بازیابی با موفقیت انجام شد");
      renderView("vehicles");
    } catch {
      errEl.textContent = "فایل نامعتبر یا PIN اشتباه است";
    }
  });
}

// ---------- Settings View ----------
function renderSettings() {
  const theme = localStorage.getItem("theme") || "system";
  viewContainer.innerHTML = `
    <div class="form">
      <h3>ظاهر برنامه</h3>
      <label><input type="radio" name="theme" value="light" ${theme === "light" ? "checked" : ""}> روشن</label>
      <label><input type="radio" name="theme" value="dark" ${theme === "dark" ? "checked" : ""}> تیره</label>
      <label><input type="radio" name="theme" value="system" ${theme === "system" ? "checked" : ""}> پیش‌فرض سیستم</label>

      <h3 style="margin-top:24px">امنیت</h3>
      <button class="btn-secondary" id="change-pin-btn">تغییر PIN</button>
    </div>
  `;

  viewContainer
    .querySelectorAll('input[name="theme"]')
    .forEach((r) => r.addEventListener("change", () => applyTheme(r.value)));

  document.getElementById("change-pin-btn").addEventListener("click", () => {
    if (confirm("برای تغییر PIN باید دوباره وارد شوید. ادامه می‌دهید؟")) {
      localStorage.removeItem(PIN_KEY);
      location.reload();
    }
  });
}

function applyTheme(theme) {
  localStorage.setItem("theme", theme);
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// ---------- Init ----------
applyTheme(localStorage.getItem("theme") || "system");

if (!localStorage.getItem(PIN_KEY)) {
  pinError.textContent = "PIN جدید تنظیم کنید";
  pinError.style.color = "green";
}

// Periodic check every 6 hours while app is open
setInterval(checkAndNotify, 6 * 60 * 60 * 1000);
