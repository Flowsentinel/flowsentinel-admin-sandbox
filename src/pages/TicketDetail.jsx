import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { callAdminApi } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'

const statusVariant = { OPEN: 'warning', IN_PROGRESS: 'info', CLOSED: 'default' }
const priorityVariant = { LOW: 'default', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' }

async function fetchTicket(id) {
  const [{ data: ticket }, { data: comments }] = await Promise.all([
    supabase.from('support_tickets').select('*, tenants(company_name, company_code)').eq('id', id).single(),
    supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
  ])
  return { ticket, comments: comments ?? [] }
}

const statusOptions = ['OPEN', 'IN_PROGRESS', 'CLOSED']

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['ticket', id], queryFn: () => fetchTicket(id) })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => callAdminApi('admin-update-ticket-status', { ticket_id: id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const addCommentMutation = useMutation({
    mutationFn: (body) => callAdminApi('admin-add-ticket-comment', { ticket_id: id, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      setComment('')
      setCommentError('')
    },
    onError: (e) => setCommentError(e.message),
  })

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Loading...</div>
  const { ticket, comments } = data ?? {}
  if (!ticket) return <div className="p-8 text-sm text-red-600">Ticket not found</div>

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => navigate('/tickets')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="h-4 w-4" /> Tickets
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{ticket.subject}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{ticket.tenants?.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant[ticket.priority] ?? 'default'}>{ticket.priority}</Badge>
          <Badge variant={statusVariant[ticket.status] ?? 'default'}>{ticket.status}</Badge>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 text-sm text-slate-700 whitespace-pre-wrap">
        {ticket.description}
      </div>

      {/* Status update */}
      {ticket.status !== 'CLOSED' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center gap-3">
          <span className="text-sm text-slate-600">Update status:</span>
          {statusOptions.filter(s => s !== ticket.status).map(s => (
            <button
              key={s}
              onClick={() => updateStatusMutation.mutate(s)}
              disabled={updateStatusMutation.isPending}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3 mb-4">
        {comments.map(c => (
          <div key={c.id} className={`rounded-xl border p-4 text-sm ${c.author_type === 'ADMIN' ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-700">{c.author_type === 'ADMIN' ? 'Admin' : 'Tenant'}</span>
              <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p className="text-slate-700 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Add comment */}
      {ticket.status !== 'CLOSED' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
          />
          {commentError && <p className="text-sm text-red-600 mt-1">{commentError}</p>}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => { setCommentError(''); addCommentMutation.mutate({ body: comment, author_type: 'ADMIN' }) }}
              disabled={!comment.trim() || addCommentMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {addCommentMutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
