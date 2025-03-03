# 🚀 Docker Compose Helper

![Docker Compose Helper Screenshot](https://via.placeholder.com/800x400?text=Docker+Compose+Helper)

A web-based tool to analyze `docker-compose.yml` files, extract environment variables, and generate proper `.env` configuration files.

---

## 🌟 Features

- 📝 **YAML Syntax Highlighting** – Integrated editor for `docker-compose` files.
- 🔍 **Automatic Detection** – Extracts environment variables effortlessly.
- 🗂 **Smart Categorization** – Groups variables (Database, Ports, Paths, Security).
- 🔑 **Secure Passwords** – Generates strong passwords for sensitive variables.
- ✅ **Validation** – Ensures valid ports, paths, and passwords.
- 📥 **Generate `.env` Files** – Easily configure and export environment variables.
- 📤 **Modified `docker-compose.yml`** – Replaces variables directly in the file.
- 💾 **Save & Load Configurations** – For future use and convenience.
- 🌙 **Dark/Light Mode** – Seamless theme switching.
- 🌐 **Multi-language Support** – English & Italian.

---

## 🌐 Live Demo

🔗 Try it now: [Docker Compose Helper](https://pricootz.github.io/docker-compose-helper)

---

## 📥 Installation

### 🔧 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/pricootz/docker-compose-helper.git
   cd docker-compose-helper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`

### 📦 Building for Production

```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

---

## 🛠 Usage

1. Paste your `docker-compose.yml` in the editor.
2. Click **"Analyze Configuration"** to extract environment variables.
3. Fill in values for the detected variables.
4. Generate a `.env` file or a modified `docker-compose.yml` file.

---

## 🐳 Docker Support

You can also run Docker Compose Helper using Docker:

```bash
docker run -p 8080:80 pricootz/docker-compose-helper
```

---

## 🤝 Contributions

Contributions are welcome! Feel free to submit a Pull Request.

1. **Fork** the repository.
2. **Create** your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m "Add some amazing feature"
   ```
4. **Push** to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request** 🚀

---

## 📜 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 🏆 Acknowledgements

Built with ❤️ using:

- ⚛️ **React**
- ⚡ **Vite**
- 🎨 **Tailwind CSS**
- 📝 **Ace Editor**
- 📄 **js-yaml**
- 🌟 **Lucide React**
- 🌎 **i18next**

---

## 👨‍💻 Author

Created by **pricootz**