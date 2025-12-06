import { render, type RenderOptions } from '@testing-library/svelte';
import type { ComponentProps, ComponentType } from 'svelte';

export function renderComponent<T extends ComponentType>(
	Component: T,
	props: ComponentProps<T> = {} as ComponentProps<T>,
	options?: RenderOptions
) {
	return render(Component, { props, ...options });
}

export function createMockStore<T>(initialValue: T) {
	let value = initialValue;
	const subscribers = new Set<(value: T) => void>();

	return {
		subscribe: (callback: (value: T) => void) => {
			subscribers.add(callback);
			callback(value);
			return () => {
				subscribers.delete(callback);
			};
		},
		set: (newValue: T) => {
			value = newValue;
			subscribers.forEach((callback) => callback(value));
		},
		update: (updater: (value: T) => T) => {
			value = updater(value);
			subscribers.forEach((callback) => callback(value));
		},
		get: () => value
	};
}
