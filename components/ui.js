// components/ui.js — Reusable UI components

import { useState, useEffect } from 'react'

// ─── Toast ──────────────────────────────────────────────────────────────────
export function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [])

  const colors = {
    success: { bg: '#0f0f23', accent: '#e2ff5d', border: '#e2ff5d44' },
    error:   { bg: '#1a0a0a', accent: '#f87171', border: '#ef444444' },
    info:    { bg: '#0a0a1a', accent: '#818cf8', border: '#6366f144' },
  }
  const c = colors[type] || colors.success

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 20, zIndex: 9999,
      background: c.bg, color: c.accent, padding: '12px 18px',
      borderRadius: 12, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      border: `1px solid ${c.border}`, animation: 'slideIn 0.3s ease',
      maxWidth: 320,
    }}>
      {msg}
    </div>
  )
}

// ─── Modal Wrapper ───────────────────────────────────────────────────────────
export function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflowY: 'auto',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0f0f23', border: '1px solid #2a2a5a',
        borderRadius: 20, padding: 28, maxWidth: 500, width: '100%',
        animation: 'fadeUp 0.25s ease',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── Button ─────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled, loading, style = {}, size = 'md' }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #e2ff5d, #b8ff00)',
      color: '#0f0f23', border: 'none', fontWeight: 700,
    },
    secondary: {
      background: 'transparent', color: '#aaa',
      border: '1px solid #2a2a5a',
    },
    danger: {
      background: '#ef444422', color: '#f87171',
      border: '1px solid #ef444444',
    },
    line: {
      background: '#06c755', color: 'white', border: 'none', fontWeight: 600,
    },
    ghost: {
      background: 'transparent', color: '#e2e2ff', border: 'none',
    },
  }
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13, borderRadius: 8 },
    md: { padding: '10px 18px', fontSize: 15, borderRadius: 10 },
    lg: { padding: '13px 24px', fontSize: 16, borderRadius: 12 },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        fontFamily: "'Sarabun', sans-serif",
        transition: 'all 0.15s',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        ...styles[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', placeholder, style = {} }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ color: '#aaa', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px',
          background: '#1a1a3e', border: '1px solid #2a2a5a',
          borderRadius: 10, color: '#e2e2ff',
          fontFamily: "'Sarabun', sans-serif", fontSize: 14,
          outline: 'none',
          ...style,
        }}
      />
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#0f0f23', border: '1px solid #1a1a3e',
      borderRadius: 16, padding: 18, ...style,
    }}>
      {children}
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    active:    { color: '#10b981', label: 'กำลังดำเนินการ' },
    overdue:   { color: '#ef4444', label: 'เกินกำหนด' },
    completed: { color: '#6b7280', label: 'เสร็จสิ้น' },
  }
  const s = map[status] || { color: '#f59e0b', label: status }
  return (
    <span style={{
      background: s.color + '22', color: s.color,
      padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      {s.label}
    </span>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, color: '#e2e2ff', margin: 0 }}>{title}</h2>
      {action}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', message }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#555' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 15 }}>{message}</p>
    </div>
  )
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────
export function Loading({ message = 'กำลังโหลด...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12, color: '#666' }}>
      <span className="spinner" />
      <span style={{ fontSize: 14 }}>{message}</span>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#e2ff5d' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ background: '#1a1a3e', borderRadius: 4, height: 5, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: 4, transition: 'width 0.5s ease',
      }} />
    </div>
  )
}
