import { render, screen } from '@testing-library/react';
import App from './App';

it('renders Maya landing title', () => {
  render(<App />);
  expect(screen.getByText(/Maya: Your Personal AI Assistant/i)).toBeInTheDocument();
});
