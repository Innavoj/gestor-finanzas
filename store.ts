// This file now re-exports from store.tsx to ensure the correct context is used throughout the application.
// This resolves conflicts if both store.ts and store.tsx exist and 'import from ./store'
// was inadvertently picking up this older store.ts file.

export {
  AppProvider,
  useAppContext,
  type AppContextType,
} from './store.tsx';
