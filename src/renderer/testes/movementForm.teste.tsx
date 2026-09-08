import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MovementForm } from '../src/components/movements/MovementForm'

function montar(props: Partial<Parameters<typeof MovementForm>[0]> = {}) {
  const onSubmit = vi.fn(() => Promise.resolve())
  const onCancel = vi.fn()
  render(
    <MovementForm
      type="despesa"
      submitLabel="Salvar"
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  )
  return { onSubmit, onCancel }
}

describe('MovementForm — a cara muda por tipo', () => {
  it('receita pede salário, não mercado', async () => {
    montar({ type: 'receita' })
    expect(await screen.findByPlaceholderText('Ex.: Salário')).toBeInTheDocument()
    expect(screen.getByText('Valor recebido (R$)')).toBeInTheDocument()
    expect(screen.getByText('Recebido em')).toBeInTheDocument()
  })

  it('despesa pede mercado', async () => {
    montar({ type: 'despesa' })
    expect(await screen.findByPlaceholderText('Ex.: Mercado')).toBeInTheDocument()
    expect(screen.getByText('Gasto em')).toBeInTheDocument()
  })

  it('conta pede vencimento; os outros tipos não', async () => {
    const { unmount } = render(
      <MovementForm type="conta" submitLabel="x" onSubmit={vi.fn()} onCancel={vi.fn()} />
    )
    expect(await screen.findByText('Vencimento')).toBeInTheDocument()
    unmount()

    montar({ type: 'receita' })
    await screen.findByPlaceholderText('Ex.: Salário')
    expect(screen.queryByText('Vencimento')).not.toBeInTheDocument()
  })
})

describe('MovementForm — categoria do tipo certo', () => {
  it('receita só pede as categorias de receita', async () => {
    montar({ type: 'receita' })
    await waitFor(() => expect(window.pluto.categories.list).toHaveBeenCalledWith('receita'))
  })

  it('conta usa categoria de despesa, não de conta', async () => {
    montar({ type: 'conta' })
    await waitFor(() => expect(window.pluto.categories.list).toHaveBeenCalledWith('despesa'))
  })

  it('sem categoria daquele tipo, oferece criar em vez de um select vazio', async () => {
    // @ts-expect-error — sobrescreve só o que este teste precisa
    window.pluto.categories.list = vi.fn(() => Promise.resolve([]))
    montar({ type: 'receita' })
    expect(await screen.findByText('Você ainda não tem categorias de receita.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar categoria/i })).toBeInTheDocument()
  })
})

describe('MovementForm — validação antes de enviar', () => {
  it('recusa nome vazio', async () => {
    const { onSubmit } = montar()
    await screen.findByPlaceholderText('Ex.: Mercado')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Informe um nome')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('recusa valor zero', async () => {
    const { onSubmit } = montar()
    await userEvent.type(await screen.findByPlaceholderText('Ex.: Mercado'), 'Mercado')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('O valor deve ser maior que zero')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('recusa conta sem vencimento', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    render(
      <MovementForm type="conta" submitLabel="Salvar" onSubmit={onSubmit} onCancel={vi.fn()} />
    )
    await userEvent.type(await screen.findByPlaceholderText('Ex.: Conta de luz'), 'Luz')
    await userEvent.type(screen.getByPlaceholderText('0,00'), '150')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Contas exigem uma data de vencimento')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia o que foi preenchido quando está tudo certo', async () => {
    const { onSubmit } = montar()
    await userEvent.type(await screen.findByPlaceholderText('Ex.: Mercado'), 'Feira')
    await userEvent.type(screen.getByPlaceholderText('0,00'), '87.5')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Feira',
      amount: 87.5,
      categoryId: 'd1',
      repeatMonthly: false,
      amountKind: 'fixo'
    })
  })
})

describe('MovementForm — recorrência', () => {
  it('não oferece repetição quando o diálogo não permite', async () => {
    montar({ type: 'despesa', allowRecurrence: false })
    await screen.findByPlaceholderText('Ex.: Mercado')
    expect(screen.queryByText('Gasto todo mês')).not.toBeInTheDocument()
  })

  it('valor variável só aparece em conta, e só com a repetição ligada', async () => {
    const { unmount } = render(
      <MovementForm
        type="despesa"
        submitLabel="x"
        allowRecurrence
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    await userEvent.click(await screen.findByLabelText(/gasto todo mês/i))
    expect(screen.queryByText(/o valor muda todo mês/i)).not.toBeInTheDocument()
    unmount()

    render(
      <MovementForm
        type="conta"
        submitLabel="x"
        allowRecurrence
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    await screen.findByPlaceholderText('Ex.: Conta de luz')
    expect(screen.queryByText(/o valor muda todo mês/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText(/chega todo mês/i))
    expect(await screen.findByText(/o valor muda todo mês/i)).toBeInTheDocument()
  })

  it('conta variável sai marcada como variavel no envio', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    render(
      <MovementForm
        type="conta"
        submitLabel="Salvar"
        allowRecurrence
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )
    await userEvent.type(await screen.findByPlaceholderText('Ex.: Conta de luz'), 'Luz')
    await userEvent.type(screen.getByPlaceholderText('0,00'), '180')
    const vencimento = document.querySelectorAll('input[type="date"]')[1] as HTMLInputElement
    await userEvent.type(vencimento, '2026-10-10')
    await userEvent.click(screen.getByLabelText(/chega todo mês/i))
    await userEvent.click(screen.getByRole('checkbox', { name: /o valor muda todo mês/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      repeatMonthly: true,
      amountKind: 'variavel',
      dueDate: '2026-10-10'
    })
  })
})
