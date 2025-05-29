const folderContainer = document.getElementById("folders");
const fileInput = document.getElementById("fileInput");
const folderNameInput = document.getElementById("folderName");

let folders = JSON.parse(localStorage.getItem("folders") || "[]");

function renderFolders() {
  folderContainer.innerHTML = "";

  // Ordner anzeigen
  folders.forEach((folder, i) => {
    const div = document.createElement("div");
    div.className = "folder";
    div.style.borderLeft = `5px solid ${folder.color || "#007aff"}`;
    div.innerHTML = `
      📁 <br>
      <b>${folder.name}</b> 
      <br>
      <button onclick="renameFolder(${i})" title="Umbenennen">✏️</button>
      <button onclick="deleteFolder(${i})" title="Löschen">🗑️</button>
    `;
    folderContainer.appendChild(div);
  });

  // Dateien anzeigen (unter Ordnern)
  renderFiles();
}

function addFolder() {
  const name = folderNameInput.value.trim();
  if (!name) return alert("Ordnername darf nicht leer sein!");
  folders.push({ name, color: randomColor() });
  saveFolders();
  folderNameInput.value = "";
  renderFolders();
}

function renameFolder(index) {
  const newName = prompt("Neuer Ordnername:", folders[index].name);
  if (newName && newName.trim()) {
    folders[index].name = newName.trim();
    saveFolders();
    renderFolders();
  }
}

function deleteFolder(index) {
  if (confirm(`Ordner "${folders[index].name}" löschen? Alle darin gespeicherten Dateien werden ebenfalls gelöscht.`)) {
    // Lösche Dateien in diesem Ordner aus IndexedDB
    deleteFilesByFolder(folders[index].name).then(() => {
      folders.splice(index, 1);
      saveFolders();
      renderFolders();
    });
  }
}

function saveFolders() {
  localStorage.setItem("folders", JSON.stringify(folders));
}

// Zufallsfarben für Ordner
function randomColor() {
  const colors = ["#007aff", "#ff9500", "#34c759", "#af52de", "#ff2d55"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Upload Button öffnet Dateiauswahl
document.getElementById("uploadBtn").addEventListener("click", () => {
  if (folders.length === 0) {
    alert("Bitte erst einen Ordner erstellen, um Dateien hochzuladen.");
    return;
  }
  showUploadDialog();
});

function showUploadDialog() {
  // Erstelle Upload-Auswahl mit Ordner-Dropdown
  const dialog = document.createElement("div");
  dialog.style = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: white; border-radius: 1rem;
    padding: 1rem; box-shadow: 0 0 10px #00000055;
    z-index: 1000;
  `;

  dialog.innerHTML = `
    <h3>Dateien hochladen</h3>
    <input type="file" id="uploadFiles" multiple />
    <br/>
    <label for="folderSelect">In Ordner speichern:</label>
    <select id="folderSelect">
      ${folders.map((f, i) => `<option value="${f.name}">${f.name}</option>`).join("")}
    </select>
    <br/><br/>
    <button id="uploadConfirm">Hochladen</button>
    <button id="uploadCancel">Abbrechen</button>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector("#uploadCancel").onclick = () => {
    document.body.removeChild(dialog);
  };

  dialog.querySelector("#uploadConfirm").onclick = async () => {
    const filesInput = dialog.querySelector("#uploadFiles");
    const folderName = dialog.querySelector("#folderSelect").value;

    if (filesInput.files.length === 0) {
      alert("Bitte mindestens eine Datei auswählen.");
      return;
    }

    for (const file of filesInput.files) {
      await saveFileToIndexedDB(file, folderName);
    }
    alert(`${filesInput.files.length} Datei(en) in Ordner "${folderName}" gespeichert.`);
    document.body.removeChild(dialog);
    renderFolders();
  };
}

// IndexedDB Setup für Dateien
const DB_NAME = "FinderFilesDB";
const STORE_NAME = "files";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("folder", "folder", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Datei speichern mit Ordnerzuweisung
async function saveFileToIndexedDB(file, folder) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  // ID = folder + filename, um Konflikte zu vermeiden
  const id = folder + "::" + file.name;

  await store.put({ id, name: file.name, file, folder, size: file.size });
  await tx.complete;
}

// Dateien eines Ordners löschen
async function deleteFilesByFolder(folderName) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("folder");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(folderName));
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Einzelne Datei löschen
async function deleteFile(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.delete(id);
  await tx.complete;
  renderFolders();
}

// Dateien aus IndexedDB holen
async function getFilesFromIndexedDB() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Dateien rendern (unter Ordnern)
async function renderFiles() {
  const fileList = await getFilesFromIndexedDB();

  if (fileList.length === 0) return;

  const filesTitle = document.createElement("h3");
  filesTitle.textContent = "📄 Gespeicherte Dateien";
  filesTitle.style.marginTop = "1rem";
  folderContainer.appendChild(filesTitle);

  fileList.forEach((item) => {
    const fileDiv = document.createElement("div");
    fileDiv.className = "folder";
    fileDiv.style.borderLeft = `5px solid #aaa`;
    fileDiv.innerHTML = `
      📄 ${item.name} <br>
      Größe: ${(item.size / 1024).toFixed(2)} KB <br>
      Ordner: <b>${item.folder}</b> <br>
      <button onclick="downloadFile('${item.id}')">⬇️ Download</button>
      <button onclick="deleteFile('${item.id}')">🗑️ Löschen</button>
    `;
    folderContainer.appendChild(fileDiv);
  });
}

// Datei herunterladen
async function downloadFile(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(id);
  request.onsuccess = () => {
    const data = request.result;
    const url = URL.createObjectURL(data.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.name;
    a.click();
    URL.revokeObjectURL(url);
  };
}

// Ordner speichern bei Änderungen
function saveFolders() {
  localStorage.setItem("folders", JSON.stringify(folders));
}

// Ordner löschen komplett (inkl Dateien)
function deleteFolder(index) {
  if (confirm(`Ordner "${folders[index].name}" löschen? Alle darin gespeicherten Dateien werden ebenfalls gelöscht.`)) {
    deleteFilesByFolder(folders[index].name).then(() => {
      folders.splice(index, 1);
      saveFolders();
      renderFolders();
    });
  }
}

// Ordner umbenennen
function renameFolder(index) {
  const newName = prompt("Neuer Ordnername:", folders[index].name);
  if (!newName || !newName.trim()) return;
  const oldName = folders[index].name;
  folders[index].name = newName.trim();
  saveFolders();

  // Dateien von altem Ordner umbenennen
  renameFilesFolder(oldName, newName.trim()).then(() => {
    renderFolders();
  });
}

// Dateien Ordner-Name ändern (z.B. wenn Ordner umbenannt wird)
async function renameFilesFolder(oldFolder, newFolder) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("folder");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(oldFolder));
    request.onsuccess = async (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const data = cursor.value;
        const newId = newFolder + "::" + data.name;
        const updatedData = { ...data, folder: newFolder, id: newId };
        await store.delete(data.id);
        await store.put(updatedData);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Ordner hinzufügen
document.getElementById("newFolderBtn").addEventListener("click", addFolder);

renderFolders();
