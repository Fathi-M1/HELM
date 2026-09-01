import React, { useEffect, useRef } from 'react';

interface ShaderBackgroundProps {
  intensity?: number;
  className?: string;
}

export const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animFrameId: number;
    let gl: WebGLRenderingContext | null = null;

    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    } catch {
      return;
    }

    if (!gl) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    syncSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncSize());
      resizeObserver.observe(canvas);
    }

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 aspect_uv = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) + 0.5;
    
    // Base color: Midnight Edition #071317
    vec3 color = vec3(0.027, 0.075, 0.090);
    
    // Subtle technical grid
    vec2 grid = fract(aspect_uv * 36.0);
    float gridLine = smoothstep(0.025, 0.0, grid.x) + smoothstep(0.025, 0.0, grid.y);
    color += gridLine * 0.022;

    // Organic planetary "glow"
    float n = snoise(aspect_uv * 1.8 + u_time * 0.04);
    color += n * 0.018;

    // Pulse effect for "active intelligence" Traditional Turquoise #02A0A0
    vec3 turquoise = vec3(0.008, 0.627, 0.627);
    float dist = distance(aspect_uv, vec2(0.5));
    float pulse = sin(u_time * 0.4) * 0.5 + 0.5;
    color += turquoise * (1.0 - smoothstep(0.0, 0.85, dist)) * 0.035 * pulse;

    // Secondary subtle warm anomaly shimmer
    vec3 warmOrange = vec3(0.988, 0.729, 0.384);
    float n2 = snoise(aspect_uv * 3.5 - u_time * 0.03);
    if (n2 > 0.6) {
      color += warmOrange * (n2 - 0.6) * 0.04;
    }

    gl_FragColor = vec4(color, 1.0);
}`;

    function createShader(type: number, src: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const vShader = createShader(gl.VERTEX_SHADER, vs);
    const fShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vShader || !fShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouseX = nx * canvas.width;
        mouseY = ny * canvas.height;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = (t: number) => {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouseX, mouseY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* Fallback & depth overlays */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#071317]/40 to-[#071317]/90 pointer-events-none" />
    </div>
  );
};
