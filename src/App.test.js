import { render, screen } from '@testing-library/react';
import App from './App';

test('renders quantum racing app', () => {
  render(<App />);
  const titleElement = screen.getByText(/QUANTUM RACING/i);
  expect(titleElement).toBeInTheDocument();
});
