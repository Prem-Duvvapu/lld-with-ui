// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

vi.mock('../pages/Home', () => ({ default: () => <h1>Module library</h1> }));
vi.mock('../components/ThemeToggle', () => ({ default: () => <button type="button">Change theme</button> }));
vi.mock('../components/BackendStatusBanner', () => ({ default: () => null }));

describe('Site utilities', () => {
  it('keeps documentation and theme controls in document flow before page content', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    const navigation = screen.getByRole('navigation', { name: 'Site utilities' });
    const documentation = within(navigation).getByRole('link', { name: /Swagger API/ });
    expect(documentation.getAttribute('href')).toBe('/swagger-ui.html');
    expect(documentation.getAttribute('rel')).toBe('noopener noreferrer');
    expect(within(navigation).getByRole('button', { name: 'Change theme' })).toBeDefined();
    expect(['fixed', 'absolute']).not.toContain(navigation.style.position);
    expect(navigation.style.flexWrap).toBe('wrap');
    expect(navigation.nextElementSibling.contains(screen.getByRole('heading', { name: 'Module library' }))).toBe(true);
  });
});
