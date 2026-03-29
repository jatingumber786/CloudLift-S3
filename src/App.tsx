import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  LockKeyhole,
  LogOut,
  CloudUpload,
  Code2,
  Trash2,
  FileText,
  Github,
  Images,
  LoaderCircle,
  Mail,
  MoonStar,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserRound,
} from "lucide-react";

import "./App.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

const formatFileSize = (bytes: number) => {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

type UploadResult = {
  fileUrl: string;
  objectKey: string;
};

type GalleryItem = {
  fileUrl: string;
  objectKey: string;
  lastModified: string | null;
};

type Theme = "light" | "dark";

const AUTH_USERNAME = "jatingumber";
const AUTH_PASSWORD = "23bcs10547";
const UPLOAD_PASSWORD = "23BCS1054710017";
const AUTH_STORAGE_KEY = "s3bucket-authenticated";
const DIRECT_BACKEND_BASE_URL = "http://localhost:3001/api";

const readJsonResponse = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { error?: string; fileUrl?: string; objectKey?: string };
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }
};

const buildApiTargets = (path: string) => {
  const targets = [`${apiBaseUrl}/${path}`];
  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isLocalHost && !apiBaseUrl.startsWith("http://localhost:3001")) {
    targets.push(`${DIRECT_BACKEND_BASE_URL}/${path}`);
  }

  return [...new Set(targets)];
};

const createUploadError = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await readJsonResponse(response);
    return new Error(payload?.error || `Failed to upload the file (${response.status}).`);
  }

  return new Error(`Failed to upload the file (${response.status}).`);
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadPassword, setUploadPassword] = useState("");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [selectedGalleryKeys, setSelectedGalleryKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const savedAuth = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(savedAuth === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadGallery();
    }
  }, [isAuthenticated]);

  const fileSummary = useMemo(() => {
    if (!selectedFile) {
      return "Choose a document, PDF, image, or media file and send it safely to your AWS S3 bucket.";
    }

    return `${selectedFile.name} | ${formatFileSize(selectedFile.size)} | ${selectedFile.type || "unknown type"}`;
  }, [selectedFile]);

  const stats = useMemo(
    () => [
      { value: "S3", label: "Cloud target" },
      { value: "Live", label: "Backend connection" },
      { value: selectedFile ? "Ready" : "Idle", label: "Upload state" },
    ],
    [selectedFile],
  );

  const profileLinks = [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/jatin-gumber-75b10b34a/", icon: UserRound },
    { label: "Portfolio", href: "https://portfolio-jatin-mauve.vercel.app/", icon: Sparkles },
    { label: "LeetCode", href: "https://leetcode.com/u/p9YUl8QEir/", icon: Code2 },
    { label: "GitHub", href: "https://github.com/jatingumber786", icon: Github },
    { label: "Contact Us", href: "mailto:gumberjatin5@gmail.com", icon: Mail },
  ];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setErrorMessage("");
    setUploadResult(null);
  };

  const loadGallery = async () => {
    setIsGalleryLoading(true);

    try {
      let loadedItems: GalleryItem[] | null = null;
      let lastError: Error | null = null;

      for (const target of buildApiTargets("gallery")) {
        try {
          const response = await fetch(target);

          if (!response.ok) {
            throw await createUploadError(response);
          }

          const payload = await readJsonResponse(response);
          loadedItems = Array.isArray(payload?.items) ? (payload.items as GalleryItem[]) : [];
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Failed to load gallery.");
        }
      }

      if (!loadedItems) {
        throw lastError || new Error("Failed to load gallery.");
      }

      setGalleryItems(loadedItems);
      setSelectedGalleryKeys((current) => current.filter((key) => loadedItems.some((item) => item.objectKey === key)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load gallery.");
    } finally {
      setIsGalleryLoading(false);
    }
  };

  const handleLogin = () => {
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
      setIsAuthenticated(true);
      setAuthError("");
      setPassword("");
      return;
    }

    setAuthError("Invalid username or password.");
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setAuthError("");
  };

  const toggleGallerySelection = (objectKey: string) => {
    setSelectedGalleryKeys((current) =>
      current.includes(objectKey) ? current.filter((key) => key !== objectKey) : [...current, objectKey],
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedGalleryKeys.length === 0) {
      setErrorMessage("Select one or more photos before deleting.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      let deleteSucceeded = false;
      let lastError: Error | null = null;

      for (const target of buildApiTargets("delete-gallery")) {
        try {
          const response = await fetch(target, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              objectKeys: selectedGalleryKeys,
            }),
          });

          if (!response.ok) {
            throw await createUploadError(response);
          }

          deleteSucceeded = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Delete failed.");
        }
      }

      if (!deleteSucceeded) {
        throw lastError || new Error("Delete failed.");
      }

      setGalleryItems((current) => current.filter((item) => !selectedGalleryKeys.includes(item.objectKey)));
      setSelectedGalleryKeys([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete gallery items.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Select a file before uploading.");
      return;
    }

    if (uploadPassword !== UPLOAD_PASSWORD) {
      setErrorMessage("Upload password is incorrect.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      let uploadPayload: { error?: string; fileUrl?: string; objectKey?: string } | null = null;
      let uploadSucceeded = false;
      let lastError: Error | null = null;

      for (const target of buildApiTargets("upload")) {
        try {
          const uploadResponse = await fetch(target, {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw await createUploadError(uploadResponse);
          }

          uploadPayload = await readJsonResponse(uploadResponse);

          if (!uploadPayload?.fileUrl || !uploadPayload?.objectKey) {
            throw new Error("Server did not return the uploaded file details.");
          }

          uploadSucceeded = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Upload failed.");
        }
      }

      if (!uploadSucceeded || !uploadPayload?.fileUrl || !uploadPayload?.objectKey) {
        throw lastError || new Error("Upload failed.");
      }

      setUploadResult({
        fileUrl: uploadPayload.fileUrl,
        objectKey: uploadPayload.objectKey,
      });
      setGalleryItems((current) => {
        const nextItem = {
          fileUrl: uploadPayload.fileUrl,
          objectKey: uploadPayload.objectKey,
          lastModified: new Date().toISOString(),
        };

        return [nextItem, ...current.filter((item) => item.objectKey !== nextItem.objectKey)];
      });
      setSelectedGalleryKeys([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="site-header">
          <a className="brand" href="#login">
            <span className="brand-mark">
              <Sparkles />
            </span>
            <span className="brand-copy">
              <strong>CloudLift</strong>
              <small>Secure uploader access</small>
            </span>
          </a>

          <button
            className="theme-switch"
            type="button"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            aria-label="Toggle theme"
          >
            <span className="theme-switch-track">
              <span className={`theme-switch-thumb theme-${theme}`}>
                {theme === "light" ? <MoonStar /> : <SunMedium />}
              </span>
            </span>
          </button>
        </header>

        <main className="login-layout" id="login">
          <section className="login-copy">
            <p className="eyebrow">Private access</p>
            <h1>Sign in to open your S3 upload workspace.</h1>
            <p className="hero-text">
              This frontend now includes a simple authentication layer for a single approved user, while your upload backend stays exactly the same.
            </p>

            <div className="feature-grid">
              <article className="feature-card reveal">
                <LockKeyhole />
                <h3>Single-user access</h3>
                <p>Only the approved credentials can open the upload dashboard for this project.</p>
              </article>
              <article className="feature-card reveal delay-one">
                <ShieldCheck />
                <h3>Backend unchanged</h3>
                <p>The login gate is frontend-only, so your existing upload backend flow remains untouched.</p>
              </article>
            </div>
          </section>

          <section className="login-card">
            <div className="login-card-head">
              <p className="section-kicker">Login</p>
              <h2>Welcome back</h2>
              <p>Enter your username and password to continue.</p>
            </div>

            <div className="field-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                className="auth-input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleLogin();
                  }
                }}
                placeholder="Enter password"
              />
            </div>

            <button className="upload-button" type="button" onClick={handleLogin}>
              <LockKeyhole />
              Sign in
            </button>

            {authError ? (
              <div className="status-card error-card">
                <strong>Login failed</strong>
                <p>{authError}</p>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="site-header">
        <a className="brand" href="#home">
          <span className="brand-mark">
            <Sparkles />
          </span>
          <span className="brand-copy">
            <strong>CloudLift</strong>
            <small>S3 upload experience</small>
          </span>
        </a>

        <nav className="site-nav">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#upload">Upload</a>
          <a href="#gallery">Gallery</a>
        </nav>

        <div className="header-actions">
          <button
            className="theme-switch"
            type="button"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            aria-label="Toggle theme"
          >
            <span className="theme-switch-track">
              <span className={`theme-switch-thumb theme-${theme}`}>
                {theme === "light" ? <MoonStar /> : <SunMedium />}
              </span>
            </span>
          </button>

          <button className="logout-button" type="button" onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </div>
      </header>

      <main className="main-layout">
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <p className="eyebrow">Professional upload portal</p>
            <h1>Upload to S3 with style.</h1>
            <p className="hero-text">
              A polished upload space for your existing backend flow.
            </p>

            <div className="hero-actions">
              <a className="primary-link" href="#upload">
                Start uploading
                <ArrowRight />
              </a>
              <a className="secondary-link" href="#about">
                Learn more
              </a>
            </div>

            <div className="stat-grid">
              {stats.map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="profile-links">
              {profileLinks.map(({ label, href, icon: Icon }) => (
                <a key={label} className="profile-link" href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">
                  <Icon />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="floating-card card-main">
              <div className="mini-label">Trusted upload flow</div>
              <h2>Upload directly from your workspace</h2>
              <p>Your backend stays untouched. The frontend now feels modern, interactive, and presentation-ready.</p>
            </div>
            <div className="floating-card card-accent">
              <CloudUpload />
              <span>Elegant file handoff to S3</span>
            </div>
            <div className="floating-card card-outline">
              <ShieldCheck />
              <span>Backend-managed AWS upload logic</span>
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="section-heading">
            <p className="eyebrow">About</p>
            <h2>Built to look professional while keeping your backend exactly the same.</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card reveal">
              <Sparkles />
              <h3>Intentional visual design</h3>
              <p>Balanced spacing, stronger type hierarchy, better color combinations, and motion that adds energy without being distracting.</p>
            </article>
            <article className="feature-card reveal delay-one">
              <MoonStar />
              <h3>Light and dark themes</h3>
              <p>A top-right professional toggle lets you switch between two complete visual modes while keeping the same workflow.</p>
            </article>
            <article className="feature-card reveal delay-two">
              <CheckCircle2 />
              <h3>Focused upload journey</h3>
              <p>Users can understand the file state, upload state, and upload result at a glance without extra clutter.</p>
            </article>
          </div>
        </section>

        <section className="upload-section" id="upload">
          <div className="upload-shell">
            <div className="upload-intro">
              <p className="eyebrow">Upload</p>
              <h2>Drop in a file and send it to S3.</h2>
              <p>
                Select your file, review its details, and upload it through the same backend flow that is already working in your project.
              </p>

              <div className="upload-tips">
                <div className="tip-card">
                  <FileText />
                  <div>
                    <strong>Current selection</strong>
                    <span>{selectedFile?.name || "No file selected yet"}</span>
                  </div>
                </div>
                <div className="tip-card">
                  <ShieldCheck />
                  <div>
                    <strong>Security note</strong>
                    <span>The frontend never stores your AWS secret key.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="upload-card">
              <label className={`upload-dropzone${selectedFile ? " has-file" : ""}`} htmlFor="file-input">
                <div className="upload-orb">
                  <CloudUpload />
                </div>
                <strong>{selectedFile ? "File selected successfully" : "Choose a file to upload"}</strong>
                <span>{fileSummary}</span>
                <input id="file-input" type="file" onChange={handleFileChange} />
              </label>

              <div className="preview-strip">
                <div className="preview-item">
                  <span>File name</span>
                  <strong>{selectedFile?.name || "--"}</strong>
                </div>
                <div className="preview-item">
                  <span>File size</span>
                  <strong>{selectedFile ? formatFileSize(selectedFile.size) : "--"}</strong>
                </div>
                <div className="preview-item">
                  <span>Format</span>
                  <strong>{selectedFile?.type || "--"}</strong>
                </div>
              </div>

              <div className="field-group upload-password-field">
                <label htmlFor="upload-password">Upload password</label>
                <input
                  id="upload-password"
                  className="auth-input"
                  type="password"
                  value={uploadPassword}
                  onChange={(event) => setUploadPassword(event.target.value)}
                  placeholder="Enter upload password"
                />
              </div>

              <button className="upload-button" type="button" onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? (
                  <>
                    <LoaderCircle className="spin" />
                    Uploading to S3...
                  </>
                ) : (
                  <>
                    <CloudUpload />
                    Upload file
                  </>
                )}
              </button>

              {errorMessage ? (
                <div className="status-card error-card">
                  <strong>Upload failed</strong>
                  <p>{errorMessage}</p>
                </div>
              ) : null}

              {uploadResult ? (
                <div className="status-card success-card">
                  <strong>Upload successful</strong>
                  <p>
                    <span>Object key:</span> {uploadResult.objectKey}
                  </p>
                  <p>
                    <span>File URL:</span>{" "}
                    <a href={uploadResult.fileUrl} target="_blank" rel="noreferrer">
                      {uploadResult.fileUrl}
                    </a>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="gallery-section" id="gallery">
          <div className="section-heading gallery-heading">
            <div>
              <p className="eyebrow">Showcase gallery</p>
              <h2>Photo gallery stored in your S3 bucket.</h2>
            </div>

            <div className="gallery-actions">
              <button className="secondary-link refresh-gallery" type="button" onClick={() => void loadGallery()}>
                <RefreshCcw className={isGalleryLoading ? "spin" : ""} />
                Refresh gallery
              </button>
              <button
                className="secondary-link delete-gallery"
                type="button"
                onClick={() => void handleDeleteSelected()}
                disabled={selectedGalleryKeys.length === 0 || isDeleting}
              >
                {isDeleting ? <LoaderCircle className="spin" /> : <Trash2 />}
                Delete selected
              </button>
            </div>
          </div>

          <div className="gallery-summary">
            <div className="tip-card">
              <Images />
              <div>
                <strong>Images from cloud storage</strong>
                <span>Uploaded photos are loaded directly from your S3 bucket and shown here.</span>
              </div>
            </div>
            <div className="tip-card">
              <CheckSquare />
              <div>
                <strong>Multi-select enabled</strong>
                <span>Select one or many photos, then use delete to remove them from S3.</span>
              </div>
            </div>
          </div>

          {selectedGalleryKeys.length > 0 ? (
            <div className="status-card">
              <strong>{selectedGalleryKeys.length} photo(s) selected</strong>
              <p>You can now delete the selected photo or multiple selected photos from the gallery.</p>
            </div>
          ) : null}

          {galleryItems.length > 0 ? (
            <div className="gallery-grid">
              {galleryItems.map((item) => {
                const isSelected = selectedGalleryKeys.includes(item.objectKey);

                return (
                  <article
                    className={`gallery-card${isSelected ? " gallery-card-selected" : ""}`}
                    key={item.objectKey}
                    onClick={() => toggleGallerySelection(item.objectKey)}
                  >
                    <button
                      className={`gallery-select${isSelected ? " gallery-select-active" : ""}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleGallerySelection(item.objectKey);
                      }}
                    >
                      {isSelected ? <CheckSquare /> : <CheckSquare />}
                      <span>{isSelected ? "Selected" : "Select"}</span>
                    </button>
                    <img className="gallery-image" src={item.fileUrl} alt={item.objectKey} loading="lazy" />
                    <div className="gallery-card-body">
                      <strong>{item.objectKey.split("/").pop()}</strong>
                      <span>{item.lastModified ? new Date(item.lastModified).toLocaleString() : "Stored in S3"}</span>
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Open image
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="status-card">
              <strong>{isGalleryLoading ? "Loading gallery..." : "No photos found yet"}</strong>
              <p>Upload an image file and it will appear here as part of your S3 showcase gallery.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
