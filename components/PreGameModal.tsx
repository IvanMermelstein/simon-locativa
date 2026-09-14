import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface PreGameModalProps {
  open: boolean
  onSubmit: (firstName: string, lastName: string, phone: string) => void
}

export function PreGameModal({ open, onSubmit }: PreGameModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  // Arranca en blanco cada vez que se muestra (una partida nueva = datos nuevos).
  useEffect(() => {
    if (open) {
      setFirstName('')
      setLastName('')
      setPhone('')
    }
  }, [open])

  const canSubmit = firstName.trim() !== '' && lastName.trim() !== '' && phone.trim() !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(firstName.trim(), lastName.trim(), phone.trim())
  }

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Antes de jugar, contanos quién sos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            className="w-full p-2 border rounded"
            placeholder="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="w-full p-2 border rounded"
            placeholder="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <input
            className="w-full p-2 border rounded"
            placeholder="Teléfono"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            Jugar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
