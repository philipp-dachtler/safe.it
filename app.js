const folderContainer = document.getElementById("folders");
const fileInput = document.getElementById("fileInput");
const folderNameInput = document.getElementById("folderName");

let folders = JSON.parse(localStorage.getItem("folders") || "[]");

function renderFolders() {
  folderContainer.innerHTML = "";
  folders.forEach((folder, i) => {
    const div = document.createElement("div");
    div.className = "folder";
    div.innerHTML = `📁 <br>${folder.name}`;
    div.style.borderLeft = `5px solid ${folder.color || "#007aff"}`;
    div.onclick = () => renameFolder(i);
    folderContainer.appendChild(div);
  });
}

function addFolder() {
  const name = folderNameInput.value.trim();
  if (!name) return;
  folders.push({ name, color: randomColor() });
  localStorage.setItem("folders", JSON.stringify(folders));
  folderNameInput.value = "";
  renderFolders();
}

function renameFolder(index) {
  const newName = prompt("Neuer Ordnername:", folders[index].name);
  if (newName) {
    folders[index].name = newName;
    localStorage.setItem("folders", JSON.stringify(folders));
    renderFolders();
  }
}

function uploadFile() {
  fileInput.click();
}

fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  alert(`${files.length} Datei(en) hochgeladen.`);
  fileInput.value = "";
});

function editFolders() {
  const reset = confirm("Alle Ordner löschen?");
  if (reset) {
    folders = [];
    localStorage.removeItem("folders");
    renderFolders();
  }
}

function randomColor() {
  const colors = ["#007aff", "#ff9500", "#34c759", "#af52de", "#ff2d55"];
  return colors[Math.floor(Math.random() * colors.length)];
}

document.getElementById("newFolderBtn").addEventListener("click", addFolder);
document.getElementById("uploadBtn").addEventListener("click", uploadFile);

renderFolders();
