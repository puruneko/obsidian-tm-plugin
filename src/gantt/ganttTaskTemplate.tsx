import { App as ObsidianApp, TFile } from "obsidian";
import React, { useState } from "react";

function TestTaskTemplateComponent({ data }) {
    const handleClick = () => {
        console.log("TestTaskTemplateComponent:", data);
    };

    return (
        <>
            {data.type !== "milestone" ? (
                <>
                    <div className="wx-text-out text-right">
                        {data.text || ""}
                    </div>
                    <button onClick={handleClick}>click!!!＃＃＃＃</button>
                </>
            ) : (
                <div className="wx-text-out text-left">
                    ＠＠＠＠＠{data.text || ""}
                </div>
            )}
        </>
    );
}

export default TestTaskTemplateComponent;
