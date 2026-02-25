import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import './Whiteboard.css';

export default function Whiteboard() {
    const { id } = useParams();
    const [initialData, setInitialData] = useState(null);
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const saveTimeoutRef = useRef(null);

    // Fetch initial whiteboard data
    useEffect(() => {
        async function fetchWhiteboard() {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data?.body?.elements) {
                setInitialData({ elements: data.body.elements });
            } else {
                setInitialData({ elements: [] });
            }
        }

        if (id) fetchWhiteboard();
    }, [id]);

    // Handle incoming Excalidraw library additions from URL hash
    useEffect(() => {
        if (!excalidrawAPI) return;

        const importLibraryFromHash = async () => {
            const hash = window.location.hash;
            if (hash.startsWith('#addLibrary=')) {
                try {
                    const hashParams = new URLSearchParams(hash.substring(1));
                    const libraryUrl = hashParams.get('addLibrary');

                    if (libraryUrl) {
                        const response = await fetch(decodeURIComponent(libraryUrl));
                        const data = await response.json();

                        // Handle varying Excalidraw library JSON shapes (version 1 vs 2)
                        const items = data.libraryItems || data.library;

                        if (data.type === 'excalidrawlib' && items) {
                            excalidrawAPI.updateLibrary({
                                libraryItems: items,
                                merge: true,
                                openLibraryMenu: true
                            });
                            // Clear the hash to prevent re-importing on refresh
                            window.history.replaceState(null, '', window.location.pathname);
                        }
                    }
                } catch (error) {
                    console.error("Failed to add library from URL", error);
                }
            }
        };

        importLibraryFromHash();

        window.addEventListener("hashchange", importLibraryFromHash);
        return () => window.removeEventListener("hashchange", importLibraryFromHash);
    }, [excalidrawAPI]);

    if (!initialData) return <div className="loading-screen"><div className="spinner" /></div>;

    const onChange = (elements) => {
        // Prevent saving empty arrays when loading or clearing
        if (!elements || elements.length === 0) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce saving to Supabase by 2 seconds
        saveTimeoutRef.current = setTimeout(async () => {
            const { error } = await supabase
                .from('items')
                .update({ body: { elements } })
                .eq('id', id);

            if (error) console.error("Failed to save whiteboard to Supabase:", error);
        }, 2000);
    };

    return (
        <div className="whiteboard-container">
            <div className="excalidraw-wrapper">
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    initialData={initialData}
                    onChange={onChange}
                    UIOptions={{
                        canvasActions: {
                            changeViewBackgroundColor: true,
                            clearCanvas: true,
                            export: { saveFileToDisk: true },
                            loadScene: true,
                            saveToActiveFile: true,
                            toggleTheme: true,
                            saveAsImage: true
                        }
                    }}
                >
                    <MainMenu>
                        <MainMenu.DefaultItems.LoadScene />
                        <MainMenu.DefaultItems.Export />
                        <MainMenu.DefaultItems.SaveAsImage />
                        <MainMenu.DefaultItems.ClearCanvas />
                        <MainMenu.Separator />
                        <MainMenu.DefaultItems.ToggleTheme />
                        <MainMenu.DefaultItems.ChangeCanvasBackground />
                    </MainMenu>
                    <WelcomeScreen>
                        <WelcomeScreen.Hints.MenuHint />
                        <WelcomeScreen.Hints.ToolbarHint />
                        <WelcomeScreen.Hints.HelpHint />
                        <WelcomeScreen.Center>
                            <WelcomeScreen.Center.Logo />
                            <WelcomeScreen.Center.Heading>TeamNotes Whiteboard</WelcomeScreen.Center.Heading>
                            <WelcomeScreen.Center.Menu>
                                <WelcomeScreen.Center.MenuItemLoadScene />
                                <WelcomeScreen.Center.MenuItemHelp />
                            </WelcomeScreen.Center.Menu>
                        </WelcomeScreen.Center>
                    </WelcomeScreen>
                </Excalidraw>
            </div>
        </div>
    );
}
