// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill requestAnimationFrame for jsdom
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

// Mock heavy/ESM-only three.js modules for Jest (CRA doesn't transform node_modules ESM)
jest.mock('three', () => {
  const Vector3 = function (x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
    this.set = (nx, ny, nz) => { this.x = nx; this.y = ny; this.z = nz; };
    this.clone = () => new Vector3(this.x, this.y, this.z);
  };
  const mock = {
    Scene: jest.fn(() => ({ add: jest.fn() })),
    PerspectiveCamera: jest.fn(() => ({ position: { z: 0 }, aspect: 0, updateProjectionMatrix: jest.fn() })),
    WebGLRenderer: jest.fn(() => ({ setSize: jest.fn(), domElement: {}, render: jest.fn() })),
    DirectionalLight: jest.fn(() => ({})),
    AmbientLight: jest.fn(() => ({})),
    BufferGeometry: jest.fn(() => ({ setAttribute: jest.fn(), attributes: { position: { needsUpdate: false } } })),
    BufferAttribute: jest.fn(() => ({})),
    PointsMaterial: jest.fn(() => ({})),
    Points: jest.fn(() => ({})),
    MeshStandardMaterial: jest.fn(() => ({})),
    Mesh: jest.fn(() => ({ position: new Vector3(), rotation: {}, material: {} })),
    Vector3,
  };
  return { __esModule: true, default: mock, ...mock };
});

jest.mock('three/examples/jsm/loaders/FontLoader', () => ({
  FontLoader: jest.fn().mockImplementation(() => ({
    load: (_url, onLoad) => onLoad({}),
  })),
}));

jest.mock('three/examples/jsm/geometries/TextGeometry', () => ({
  TextGeometry: jest.fn(() => ({})),
}));

// Mock axios to avoid importing ESM distribution during tests
jest.mock('axios', () => {
  const client = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn((fn) => fn({ headers: {} })) } },
  };
  const axios = {
    create: jest.fn(() => client),
    get: client.get,
    post: client.post,
    put: client.put,
    delete: client.delete,
  };
  return axios;
});
