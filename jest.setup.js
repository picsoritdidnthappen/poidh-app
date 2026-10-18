import '@testing-library/jest-dom/extend-expect';
import { TextDecoder, TextEncoder } from 'util';

// jsdom (Jest 27) lacks these; viem needs them at import time.
Object.assign(global, { TextEncoder, TextDecoder });

// Allow router mocks.
// eslint-disable-next-line no-undef
jest.mock('next/router', () => require('next-router-mock'));
