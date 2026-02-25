import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import './Whiteboard.css';

export default function Whiteboard() {
    const { id } = useParams();
    const [initialData, setInitialData] = useState(null);
    const saveTimeoutRef = useRef(null);

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
