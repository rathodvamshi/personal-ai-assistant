import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import authService from './services/auth';
import './styles/App.css';

// Home/landing page with 3D background animation
const Home = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const mountRef = useRef(null);

    const handleScroll = useCallback(() => {
        setShowScrollTop(window.scrollY > 300);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);

        // Setup 3D background animation
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 15;

        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        const mount = mountRef.current;
        mount.appendChild(renderer.domElement);

        // Lights
        const directionalLight = new THREE.DirectionalLight(0x3b82f6, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);

        // Particle system for trails
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 1000;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleVelocities = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * 20;
            particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
            particleVelocities[i * 3] = (Math.random() - 0.5) * 0.01;
            particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
            particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x3b82f6,
            size: 0.05,
            transparent: true,
            opacity: 0.3,
        });
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);

        // Symbols and tools
        const symbols = ['∑', 'π', '√', '∞', '∫', '≈', 'θ', '🧭', '📏', '🖩', '📐'];
        const meshes = [];
        const targetPositions = [];
        const initialPositions = [];
        const timeOffsets = symbols.map(() => Math.random() * 2 * Math.PI);

        // Simulate brain shape with a point cloud
        const brainRadius = 3;
        symbols.forEach((_, i) => {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = brainRadius * Math.cbrt(Math.random());
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            targetPositions.push(new THREE.Vector3(x, y, z));
        });

        const fontLoader = new FontLoader();
        fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            symbols.forEach((sym, i) => {
                const textGeo = new TextGeometry(sym, {
                    font,
                    size: 0.3,
                    depth: 0.1,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.01,
                    bevelSize: 0.01,
                    bevelOffset: 0,
                    bevelSegments: 5,
                });

                const material = new THREE.MeshStandardMaterial({
                    color: 0x3b82f6,
                    metalness: 0.9,
                    roughness: 0.2,
                    emissive: 0x3b82f6,
                    emissiveIntensity: 0.8,
                });

                const mesh = new THREE.Mesh(textGeo, material);
                mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
                initialPositions.push(mesh.position.clone());
                scene.add(mesh);
                meshes.push(mesh);
            });
        });

        // Animation loop
        const animate = (time) => {
            requestAnimationFrame(animate);

            const scrollFraction = Math.min(document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight), 1);

            meshes.forEach((mesh, i) => {
                const target = targetPositions[i];
                const initial = initialPositions[i];
                mesh.position.lerpVectors(target, initial, scrollFraction);
                mesh.rotation.y = scrollFraction * Math.PI * 2 + Math.sin(time / 1000 + timeOffsets[i]) * 0.2;
                mesh.rotation.x = Math.sin(time / 1000 + timeOffsets[i]) * 0.1;
                mesh.material.emissiveIntensity = 0.8 + Math.sin(time / 500 + timeOffsets[i]) * 0.2 * (1 - scrollFraction);
            });

            // Update particles
            for (let i = 0; i < particleCount; i++) {
                particlePositions[i * 3] += particleVelocities[i * 3] * (1 - scrollFraction);
                particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1] * (1 - scrollFraction);
                particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2] * (1 - scrollFraction);
                if (Math.abs(particlePositions[i * 3]) > 10 || Math.abs(particlePositions[i * 3 + 1]) > 10 || Math.abs(particlePositions[i * 3 + 2]) > 10) {
                    particlePositions[i * 3] = (Math.random() - 0.5) * 20;
                    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
                    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
                }
            }
            particleGeometry.attributes.position.needsUpdate = true;

            renderer.render(scene, camera);
        };
        requestAnimationFrame(animate);

        // Handle resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [handleScroll]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="home-container">
            <div ref={mountRef} className="bg-canvas"></div>

            <div className="hero-section">
                <h1 className="hero-title">Maya: Your Personal AI Assistant</h1>
                <p className="hero-subtitle">An intelligent, adaptive partner for managing tasks and memories with a human touch.</p>
                <div className="hero-cta">
                    <Link to="/login" className="cta-button login-link">Get Started</Link>
                    <Link to="/register" className="cta-button register-link">Sign Up</Link>
                </div>
            </div>

            <section className="about-section">
                <h2 className="section-title">About Maya</h2>
                <p className="section-text">
                    Maya is a cutting-edge personal AI assistant designed to understand you deeply. Powered by advanced AI technologies, Maya remembers your conversations, learns your preferences, and adapts to your unique style, making every interaction feel natural and personalized.
                </p>
                <div className="feature-cards">
                    <div className="feature-card">
                        <h3>Conversational Memory</h3>
                        <p>Recalls past interactions for seamless, natural conversations.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Personalized Learning</h3>
                        <p>Adapts to your preferences, tone, and frequent tasks.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Multi-Format Support</h3>
                        <p>Handles text, voice, and potentially images or videos.</p>
                    </div>
                </div>
            </section>

            <section className="goals-section">
                <h2 className="section-title">Our Goals</h2>
                <ul className="goals-list">
                    <li>Deliver highly contextual and personalized responses.</li>
                    <li>Support a wide range of tasks, from reminders to complex queries.</li>
                    <li>Continuously improve through learning from user interactions.</li>
                    <li>Provide a fast, efficient, and reliable experience.</li>
                </ul>
            </section>

            <section className="why-best-section">
                <h2 className="section-title">Why Maya is the Best</h2>
                <p className="section-text">
                    Maya stands out by combining a powerful language model (Google Gemini Pro) with a sophisticated memory system and knowledge graph. This allows Maya to understand relationships, learn over time, and deliver responses that feel uniquely tailored to you. Our real-time backend and intuitive interface ensure a seamless experience, whether you're managing tasks or having a casual chat.
                </p>
            </section>

            <section className="tech-stack-section">
                <h2 className="section-title">Tech Stack</h2>
                <div className="tech-stack-grid">
                    <div className="tech-item">Google Gemini Pro: Language Engine</div>
                    <div className="tech-item">Redis +PostgreSQL: Memory Storage</div>
                    <div className="tech-item">Neo4j/ArangoDB: Knowledge Graph</div>
                    <div className="tech-item">FastAPI + WebSocket: Real-Time Backend</div>
                    <div className="tech-item">React: Intuitive Frontend</div>
                    <div className="tech-item">Celery: Task Management</div>
                    <div className="tech-item">ELK Stack: Performance Monitoring</div>
                </div>
            </section>

            <footer className="footer">
                <p>Built with ❤️ by the Maya Team</p>
                <p>Empowering you with AI that grows with you.</p>
                <div className="footer-links">
                    <a href="https://x.ai" target="_blank" rel="noopener noreferrer">About xAI</a>
                    <a href="https://x.ai/api" target="_blank" rel="noopener noreferrer">API Access</a>
                    <a href="https://help.x.com/en/using-x/x-premium" target="_blank" rel="noopener noreferrer">Premium Plans</a>
                </div>
            </footer>

            {showScrollTop && (
                <button onClick={scrollToTop} className="back-to-top">
                    ↑
                </button>
            )}
        </div>
    );
};

// A wrapper to protect routes that require authentication
const PrivateRoute = ({ children }) => {
    const user = authService.getCurrentUser();
    return user ? children : <Navigate to="/login" />;
};

function App() {
    const [currentUser, setCurrentUser] = useState(undefined);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(undefined);
        window.location.href = "/login";
    };

    return (
        <Router>
            <div className="app-container">
                <nav className="navbar">
                    <Link to={currentUser ? "/dashboard" : "/"} className="nav-brand">
                        Maya
                    </Link>
                    <div className="nav-links">
                        {currentUser ? (
                            <button onClick={handleLogout} className="nav-button">
                                Logout
                            </button>
                        ) : (
                            <>
                                <Link to="/login" className="nav-link">Login</Link>
                                <Link to="/register" className="nav-link register-btn">Register</Link>
                            </>
                        )}
                    </div>
                </nav>

                <main className="app-content">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route 
                            path="/dashboard" 
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            } 
                        />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;