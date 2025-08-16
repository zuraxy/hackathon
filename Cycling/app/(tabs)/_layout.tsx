import { Slot } from 'expo-router';
import React from 'react';

// No Tabs UI; just render the nested screen(s) directly.
export default function TabsGroupLayout() {
	return <Slot />;
}
