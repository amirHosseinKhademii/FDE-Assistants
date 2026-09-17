import { createFileRoute } from '@tanstack/react-router';
import { Desk } from '../pages/Desk';

export const Route = createFileRoute('/desk')({ component: Desk });
