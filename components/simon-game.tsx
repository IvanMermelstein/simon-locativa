"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import cabeceraSimon from "@/public/logo-superior-simon.png"
import wedge1 from "@/public/wedge-1.png"
import wedge2 from "@/public/wedge-2.png"
import wedge3 from "@/public/wedge-3.png"
import wedge4 from "@/public/wedge-4.png"
import wedge5 from "@/public/wedge-5.png"
import wedge6 from "@/public/wedge-6.png"
import { formatTime } from "@/lib/utils"
import { NameModal } from "./NameModal"
import { PreGameModal } from "./PreGameModal"

type Phase = "idle" | "countdown" | "sequence" | "input" | "roundComplete" | "gameover"

interface ColorDef {
  id: number
  name: string
  baseFrom: string
  baseTo: string
  litFrom: string
  lit: string
  glow: string
  logo: typeof cabeceraSimon
  logoBg: string
  logoPad: number // padding interno del logo, en % — más chico = logo más "zoomeado"
}

const COLORS: ColorDef[] = [
  { id: 0, name: "Rojo", baseFrom: "#c04545", baseTo: "#5a1010", litFrom: "#ffb3b3", lit: "#ef4444", glow: "rgba(239,68,68,0.9)", logo: wedge1, logoBg: "#ffffff", logoPad: 4 },
  { id: 1, name: "Verde", baseFrom: "#3c9e63", baseTo: "#0c3a1e", litFrom: "#a7f3d0", lit: "#22c55e", glow: "rgba(34,197,94,0.9)", logo: wedge2, logoBg: "#ffffff", logoPad: 4 },
  { id: 2, name: "Azul", baseFrom: "#4a7fc9", baseTo: "#10294d", litFrom: "#bfdbfe", lit: "#3b82f6", glow: "rgba(59,130,246,0.9)", logo: wedge3, logoBg: "#ffffff", logoPad: 4 },
  { id: 3, name: "Amarillo", baseFrom: "#cfa52e", baseTo: "#4f3f06", litFrom: "#fef08a", lit: "#eab308", glow: "rgba(234,179,8,0.9)", logo: wedge4, logoBg: "#ffffff", logoPad: 4 },
  { id: 4, name: "Violeta", baseFrom: "#9256cf", baseTo: "#2e0e4f", litFrom: "#e9d5ff", lit: "#a855f7", glow: "rgba(168,85,247,0.9)", logo: wedge5, logoBg: "#ffffff", logoPad: 4 },
  { id: 5, name: "Naranja", baseFrom: "#d97a35", baseTo: "#4f2006", litFrom: "#fed7aa", lit: "#f97316", glow: "rgba(249,115,22,0.9)", logo: wedge6, logoBg: "#ffffff", logoPad: 4 },
]

// Ángulo central de cada gajo, empezando arriba y en sentido horario
const ANGLES = COLORS.map((_, i) => -90 + i * 60)
const WEDGE_SPAN = 30 // cada gajo cubre +/-30° alrededor de su ángulo central (60° en total)
const OUTER_R = 98
const INNER_R = 32 // el hub central mide 34% (radio 34 en un viewBox de 200) — se mete 2 unidades debajo para que no quede hueco
const LOGO_RADIUS_PCT = 33 // radio (en % del contenedor) donde se centra la insignia de cada logo, a mitad de camino entre el hub y el borde

function wedgePath(cx: number, cy: number, innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const f = (n: number) => n.toFixed(2)
  const outerStart = { x: cx + outerR * Math.cos(toRad(startDeg)), y: cy + outerR * Math.sin(toRad(startDeg)) }
  const outerEnd = { x: cx + outerR * Math.cos(toRad(endDeg)), y: cy + outerR * Math.sin(toRad(endDeg)) }
  const innerEnd = { x: cx + innerR * Math.cos(toRad(endDeg)), y: cy + innerR * Math.sin(toRad(endDeg)) }
  const innerStart = { x: cx + innerR * Math.cos(toRad(startDeg)), y: cy + innerR * Math.sin(toRad(startDeg)) }
  return [
    `M ${f(outerStart.x)} ${f(outerStart.y)}`,
    `A ${outerR} ${outerR} 0 0 1 ${f(outerEnd.x)} ${f(outerEnd.y)}`,
    `L ${f(innerEnd.x)} ${f(innerEnd.y)}`,
    `A ${innerR} ${innerR} 0 0 0 ${f(innerStart.x)} ${f(innerStart.y)}`,
    "Z",
  ].join(" ")
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomColorId() {
  return Math.floor(Math.random() * COLORS.length)
}

// Velocidades ~42% más rápidas que la base original (700/320/600/800ms: -10%, -20%, -20% acumulado)
function onDurationForRound(round: number) {
  return Math.max(162, 403 - (round - 1) * 18)
}

function gapDurationForRound(round: number) {
  return Math.max(86, 184 - (round - 1) * 7)
}

export interface GameResult {
  rounds: number
  keysInRound: number
  time: number
}

interface ErrorFlash {
  pressed: number
  correct: number
}

export default function SimonGame() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [sequence, setSequence] = useState<number[]>([])
  const [playerIndex, setPlayerIndex] = useState(0)
  const [playbackCount, setPlaybackCount] = useState(0)
  const [litIndex, setLitIndex] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [bestRound, setBestRound] = useState(0)
  const [errorFlash, setErrorFlash] = useState<ErrorFlash | null>(null)
  const [roundFlash, setRoundFlash] = useState(false)
  const [showPreGameModal, setShowPreGameModal] = useState(false)
  const [playerInfo, setPlayerInfo] = useState<{ firstName: string; lastName: string; phone: string } | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const startTimeRef = useRef<number | null>(null)
  const clickLockRef = useRef(false)
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const round = sequence.length

  // Reproduce la secuencia cuando cambia (nueva ronda)
  useEffect(() => {
    if (phase !== "sequence" || sequence.length === 0) return
    let cancelled = false

    setPlaybackCount(0)
    ;(async () => {
      await sleep(346)
      for (let i = 0; i < sequence.length; i++) {
        if (cancelled) return
        setLitIndex(sequence[i])
        setPlaybackCount(i + 1)
        await sleep(onDurationForRound(sequence.length))
        if (cancelled) return
        setLitIndex(null)
        await sleep(gapDurationForRound(sequence.length))
      }
      if (!cancelled) {
        setPlayerIndex(0)
        setPhase("input")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sequence, phase])

  // Cronómetro en vivo mientras se juega
  useEffect(() => {
    if (phase === "idle" || phase === "countdown" || phase === "gameover") return
    const id = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 250)
    return () => clearInterval(id)
  }, [phase])

  // Cuenta regresiva 3-2-1 antes de arrancar: le da tiempo al jugador a
  // levantar la vista del popup de datos (y de que se cierre el teclado del
  // celular) antes de que arranque la secuencia, para que no se la pierda.
  useEffect(() => {
    if (phase !== "countdown") return
    let cancelled = false
    ;(async () => {
      for (let n = 3; n >= 1; n--) {
        if (cancelled) return
        setCountdown(n)
        await sleep(700)
      }
      if (!cancelled) beginRound()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const resetGameState = () => {
    if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current)
    startTimeRef.current = null
    setElapsed(0)
    setResult(null)
    setBestRound(0)
    setShowNameModal(false)
    setErrorFlash(null)
    setRoundFlash(false)
    setPlaybackCount(0)
    setSequence([])
    setPlayerIndex(0)
  }

  const beginRound = () => {
    startTimeRef.current = Date.now()
    setSequence([randomColorId()])
    setPlayerIndex(0)
    setPhase("sequence")
  }

  // Guarda el puntaje sin pedir confirmación — el dato de contacto ya se
  // levantó en el popup previo, así que apenas se conoce el resultado final
  // (ganó una vuelta más o falló) se manda solo, se vea o no se vea el popup.
  const saveScore = (finalResult: GameResult) => {
    if (!playerInfo) return
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: playerInfo.firstName,
        lastName: playerInfo.lastName,
        phone: playerInfo.phone,
        rounds: finalResult.rounds,
        keysInRound: finalResult.keysInRound,
        time: finalResult.time,
      }),
    })
  }

  const handleColorClick = (colorId: number) => {
    if (phase !== "input" || clickLockRef.current) return

    const expected = sequence[playerIndex]

    if (colorId !== expected) {
      const finalTime = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0
      const finalResult: GameResult = { rounds: round - 1, keysInRound: playerIndex, time: finalTime }
      setResult(finalResult)
      setElapsed(finalTime)
      setErrorFlash({ pressed: colorId, correct: expected })
      setPhase("gameover")
      saveScore(finalResult)
      pendingTimeoutRef.current = setTimeout(() => {
        setErrorFlash(null)
        setShowNameModal(true)
      }, 1600)
      return
    }

    clickLockRef.current = true
    setLitIndex(colorId)
    setTimeout(() => {
      setLitIndex(null)
      clickLockRef.current = false
    }, 220)

    const nextIndex = playerIndex + 1
    if (nextIndex === sequence.length) {
      setBestRound(round)
      setPlayerIndex(nextIndex)
      setPhase("roundComplete")
      setRoundFlash(true)
      pendingTimeoutRef.current = setTimeout(() => {
        setRoundFlash(false)
        setSequence((prev) => [...prev, randomColorId()])
        setPhase("sequence")
      }, 461)
    } else {
      setPlayerIndex(nextIndex)
    }
  }

  // Una partida nueva (hub/botón Iniciar-Reiniciar) vuelve a pedir
  // nombre/apellido/teléfono, ya que es un intento voluntario y distinto.
  const requestNewGame = () => {
    setShowPreGameModal(true)
  }

  const handlePreGameSubmit = (firstName: string, lastName: string, phone: string) => {
    setPlayerInfo({ firstName, lastName, phone })
    setShowPreGameModal(false)
    resetGameState()
    setPhase("countdown")
  }

  // Al cerrar el popup de resultado (con "OK") se vuelve a la pantalla
  // principal en reposo, igual que si se acabara de abrir la página — sin
  // volver a mostrar ningún popup hasta que el jugador toque Iniciar/el
  // centro del disco por su cuenta.
  const handleGameOverClose = () => {
    setShowNameModal(false)
    resetGameState()
    setPhase("idle")
  }

  const statusText = () => {
    if (phase === "idle") return "Presioná Iniciar para jugar"
    if (phase === "countdown") return "¡Prepará los dedos, ya arranca!"
    if (phase === "sequence") return "Prestá atención a la secuencia..."
    if (phase === "input") return "¡Tu turno! Repetí la secuencia"
    if (phase === "roundComplete") return "¡Muy bien! Sumaste una vuelta"
    if (phase === "gameover") return errorFlash ? "Ese no era... el correcto era el que brilla" : "¡Se acabó! Guardá tu puntaje"
    return ""
  }

  // Estilo del hub central según el estado del juego
  const hubClasses = errorFlash
    ? "bg-red-950/70 border-red-400/60"
    : roundFlash
      ? "bg-emerald-500/30 border-emerald-300/70"
      : phase === "countdown"
        ? "bg-amber-500/30 border-amber-300/70 animate-pulse"
        : phase === "sequence"
          ? "bg-blue-950/60 border-blue-300/40 animate-pulse"
          : phase === "input"
            ? "bg-emerald-950/60 border-emerald-300/50"
            : phase === "gameover"
              ? "bg-red-950/70 border-red-400/50"
              : "bg-black/40 border-white/20"

  const hubLabel = phase === "sequence" ? "MIRÁ" : phase === "input" ? "TU TURNO" : null

  const showDots = phase === "sequence" || phase === "input" || phase === "roundComplete"

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-[#0B2558] to-black">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="relative w-full max-w-[500px] aspect-[500/263] mx-auto my-2 overflow-hidden">
            <Image
              src={cabeceraSimon}
              fill
              priority
              className="object-cover object-center"
              alt="Locativa Garantías"
            />
          </div>
          <p className="text-gray-100">Memorizá y repetí la secuencia de colores</p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 items-center mb-6 px-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{round > 0 ? round : "-"}</div>
            <div className="text-sm text-gray-300">Ronda</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{formatTime(elapsed)}</div>
            <div className="text-sm text-gray-300">Tiempo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{bestRound}</div>
            <div className="text-sm text-gray-300">Vueltas OK</div>
          </div>
          <Button onClick={requestNewGame} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {phase === "idle" ? "Iniciar" : "Reiniciar"}
          </Button>
          <Link href="/ranking">
            <Button variant="outline" size="sm" className="gap-2">
              <Trophy className="w-4 h-4" />
              Ranking
            </Button>
          </Link>
        </div>

        <p className="text-center text-gray-100 mb-2 h-6">{statusText()}</p>

        {/* Progreso de la secuencia */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-3 min-h-[14px] px-8">
          {showDots &&
            sequence.map((_, i) => {
              const filled =
                phase === "input" ? i < playerIndex : phase === "roundComplete" ? true : i < playbackCount
              return (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-150 ${
                    filled
                      ? phase === "sequence"
                        ? "bg-sky-300"
                        : "bg-emerald-400"
                      : "bg-white/20"
                  }`}
                />
              )
            })}
        </div>

        {/* Board */}
        <div
          className={`flex justify-center p-3 sm:p-5 bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border overflow-hidden transition-all duration-300 mb-6 ${
            errorFlash
              ? "border-red-400/60 ring-4 ring-red-500/70"
              : roundFlash
                ? "border-emerald-300/60 ring-4 ring-emerald-400/70"
                : "border-white/20"
          }`}
        >
          <div
            className="relative aspect-square w-[min(90vw,520px)] select-none rounded-full"
            style={{ boxShadow: "0 10px 20px rgba(0,0,0,0.5)" }}
          >
            {/* Disco: 6 gajos pegados formando un círculo completo, como el Simon original */}
            {/* La sombra del disco va en el div contenedor (no en el svg) para que no interfiera
                con el drop-shadow individual de cada gajo al iluminarse */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full touch-manipulation">
              <defs>
                <radialGradient id="grad-wrong" cx="100" cy="100" r="98" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#dc2626" />
                </radialGradient>
                {COLORS.map((color) => (
                  <radialGradient
                    key={`base-${color.id}`}
                    id={`grad-base-${color.id}`}
                    cx="100"
                    cy="100"
                    r="98"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor={color.baseFrom} />
                    <stop offset="100%" stopColor={color.baseTo} />
                  </radialGradient>
                ))}
                {COLORS.map((color) => (
                  <radialGradient
                    key={`lit-${color.id}`}
                    id={`grad-lit-${color.id}`}
                    cx="100"
                    cy="100"
                    r="98"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor={color.litFrom} />
                    <stop offset="100%" stopColor={color.lit} />
                  </radialGradient>
                ))}
              </defs>

              {COLORS.map((color, i) => {
                const d = wedgePath(100, 100, INNER_R, OUTER_R, ANGLES[i] - WEDGE_SPAN, ANGLES[i] + WEDGE_SPAN)

                const isWrongPressed = errorFlash?.pressed === color.id
                const isCorrectHint = errorFlash?.correct === color.id && !isWrongPressed
                const isLit = litIndex === color.id || isCorrectHint
                const disabled = phase !== "input"

                const fill = isWrongPressed
                  ? "url(#grad-wrong)"
                  : isLit
                    ? `url(#grad-lit-${color.id})`
                    : `url(#grad-base-${color.id})`

                return (
                  <path
                    key={color.id}
                    d={d}
                    fill={fill}
                    stroke="#161616"
                    strokeWidth={3}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={color.name}
                    aria-disabled={disabled}
                    onClick={() => handleColorClick(color.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleColorClick(color.id)
                      }
                    }}
                    className={`outline-none ${disabled ? "" : "cursor-pointer"} ${isCorrectHint ? "animate-pulse" : ""}`}
                  />
                )
              })}
            </svg>

            {/* Insignias con los logos: una tarjetita con el color de fondo propio de cada logo
                y sombra, centrada en cada gajo, para que el logo (cuadrado) no choque contra
                el color/forma del gajo */}
            {COLORS.map((color, i) => {
              const angleRad = (ANGLES[i] * Math.PI) / 180
              const top = 50 + LOGO_RADIUS_PCT * Math.sin(angleRad)
              const left = 50 + LOGO_RADIUS_PCT * Math.cos(angleRad)
              return (
                <div
                  key={color.id}
                  className="absolute rounded-full pointer-events-none overflow-hidden"
                  style={{
                    width: "26%",
                    height: "26%",
                    top: `${top}%`,
                    left: `${left}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: color.logoBg,
                    boxShadow: `0 3px 8px rgba(0,0,0,0.5), 0 0 0 2px ${color.lit}`,
                  }}
                >
                  <Image
                    src={color.logo}
                    alt=""
                    fill
                    loading="eager"
                    sizes="120px"
                    style={{ padding: `${color.logoPad}%` }}
                    className="object-contain"
                  />
                </div>
              )
            })}

            {/* Hub central: además de mostrar el estado, funciona como botón de iniciar/reiniciar */}
            <div
              role="button"
              tabIndex={0}
              aria-label={phase === "idle" ? "Iniciar juego" : "Reiniciar juego"}
              onClick={requestNewGame}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  requestNewGame()
                }
              }}
              className={`absolute rounded-full border flex flex-col items-center justify-center text-white font-bold select-none cursor-pointer outline-none transition-colors duration-300 hover:brightness-125 active:scale-95 ${hubClasses}`}
              style={{
                width: "34%",
                height: "34%",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${roundFlash ? 1.08 : 1})`,
                transitionProperty: "background-color, border-color, transform, filter",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              {errorFlash ? (
                <span className="text-3xl sm:text-4xl text-red-300">✗</span>
              ) : roundFlash ? (
                <span className="text-3xl sm:text-4xl text-emerald-300">✓</span>
              ) : phase === "countdown" ? (
                <span className="text-4xl sm:text-5xl text-amber-200">{countdown}</span>
              ) : round > 0 ? (
                <>
                  <span className="text-2xl sm:text-3xl leading-none">{round}</span>
                  {hubLabel && (
                    <span className="text-[9px] sm:text-[11px] uppercase tracking-widest opacity-80 mt-1">
                      {hubLabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lg sm:text-xl">SIMON</span>
              )}
            </div>
          </div>
        </div>

      </div>
      <NameModal
        open={showNameModal}
        result={result}
        onClose={handleGameOverClose}
      />
      <PreGameModal open={showPreGameModal} onSubmit={handlePreGameSubmit} />
    </div>
  )
}
