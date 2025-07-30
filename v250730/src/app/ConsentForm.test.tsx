import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsentForm from './ConsentForm';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('## Test Consent Form'),
  })
) as jest.Mock;

describe('ConsentForm', () => {
  const onConsentMock = jest.fn();

  beforeEach(() => {
    onConsentMock.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the consent form and fetches the markdown content', async () => {
    render(<ConsentForm onConsent={onConsentMock} participantId="test-participant" />);
    
    expect(screen.getByRole('heading', { name: /研究参加への同意/i })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test Consent Form')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith('/docs/同意説明文書_Spirit-in-Physics_250620_ver2.0.md');
  });

  it('disables the submit button until all agreements are checked and signature is provided', async () => {
    render(<ConsentForm onConsent={onConsentMock} participantId="test-participant" />);
    const submitButton = screen.getByRole('button', { name: /同意して実験を開始する/i });
    
    expect(submitButton).toBeDisabled();

    // Check all boxes
    fireEvent.click(screen.getByLabelText(/研究内容を理解しました/i));
    fireEvent.click(screen.getByLabelText(/自発的に研究に参加することに同意します/i));
    fireEvent.click(screen.getByLabelText(/いつでも同意を撤回できることを理解しました/i));
    fireEvent.click(screen.getByLabelText(/音声と映像の記録に同意します/i));

    expect(submitButton).toBeDisabled();

    // Fill signature
    fireEvent.change(screen.getByLabelText(/署名/i), { target: { value: 'Test User' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('calls onConsent with participantId and signature when the form is submitted', async () => {
    render(<ConsentForm onConsent={onConsentMock} participantId="test-participant-123" />);
    
    // Agree to all and sign
    fireEvent.click(screen.getByLabelText(/研究内容を理解しました/i));
    fireEvent.click(screen.getByLabelText(/自発的に研究に参加することに同意します/i));
    fireEvent.click(screen.getByLabelText(/いつでも同意を撤回できることを理解しました/i));
    fireEvent.click(screen.getByLabelText(/音声と映像の記録に同意します/i));
    fireEvent.change(screen.getByLabelText(/署名/i), { target: { value: 'Jun Kawasaki' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /同意して実験を開始する/i }));
    
    expect(onConsentMock).toHaveBeenCalledWith('test-participant-123', 'Jun Kawasaki');
    expect(onConsentMock).toHaveBeenCalledTimes(1);
  });
}); 