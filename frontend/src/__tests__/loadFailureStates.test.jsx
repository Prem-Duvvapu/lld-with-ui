// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as splitwiseApi from '../lld/splitwise/api';
import SplitwisePage from '../lld/splitwise/SplitwisePage';

vi.mock('../lld/splitwise/api');

afterEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
});

describe('Load failure states', () => {
  it('Splitwise shows the failure message instead of rendering the Error object', async () => {
    // Rendering an Error instance as a React child threw "Objects are not valid as a React child"
    // and blanked the page whenever the initial user load failed.
    splitwiseApi.getUsers.mockRejectedValue(new Error('Sandbox backend unavailable'));
    splitwiseApi.getEvents.mockResolvedValue([]);
    render(<MemoryRouter><SplitwisePage /></MemoryRouter>);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Sandbox backend unavailable');

    splitwiseApi.getUsers.mockResolvedValue([{ id: 'u1', name: 'Asha', email: 'asha@example.com' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: /Asha/ })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(splitwiseApi.getUsers).toHaveBeenCalledTimes(2);
  });
});
