/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, describe, beforeEach, afterEach, it, runs, waitsFor, expect, brackets, waitsForDone */

define(function (require, exports, module) {
    'use strict';
    
    // Load dependent modules
    var CommandManager,      // loaded from brackets.test
        Commands,            // loaded from brackets.test
        EditorManager,       // loaded from brackets.test
        DocumentManager,     // loaded from brackets.test
        FileViewController,
        SpecRunnerUtils     = require("spec/SpecRunnerUtils");
    
    
    describe("EditorOptionHandlers", function () {
        this.category = "integration";
        
        var testPath = SpecRunnerUtils.getTestPath("/spec/EditorOptionHandlers-test-files"),
            testWindow;
        
        var CSS_FILE  = testPath + "/test.css",
            HTML_FILE = testPath + "/test.html";
        
        
        beforeEach(function () {
            SpecRunnerUtils.createTestWindowAndRun(this, function (w) {
                testWindow = w;

                // Load module instances from brackets.test
                CommandManager      = testWindow.brackets.test.CommandManager;
                Commands            = testWindow.brackets.test.Commands;
                EditorManager       = testWindow.brackets.test.EditorManager;
                DocumentManager     = testWindow.brackets.test.DocumentManager;
                FileViewController  = testWindow.brackets.test.FileViewController;
               
                SpecRunnerUtils.loadProjectInTestWindow(testPath);
            });
        });

        afterEach(function () {
            SpecRunnerUtils.closeTestWindow();
        });
        
        
        function checkLineWrapping(firstPos, secondPos, shouldWrap, inlineEditor) {
            runs(function () {
                var firstLineBottom,
                    nextLineBottom,
                    editor = inlineEditor || EditorManager.getCurrentFullEditor();
                
                expect(editor).toBeTruthy();

                editor.setCursorPos(firstPos);
                firstLineBottom = editor._codeMirror.cursorCoords(null, "local").bottom;

                editor.setCursorPos(secondPos);
                nextLineBottom = editor._codeMirror.cursorCoords(null, "local").bottom;
                if (shouldWrap) {
                    expect(firstLineBottom).toBeLessThan(nextLineBottom);
                } else {
                    expect(firstLineBottom).toEqual(nextLineBottom);
                }
            });
        }
        
        
        // Helper functions to open editors / toggle options
        function openEditor(fullPath) {
            runs(function () {
                var promise = CommandManager.execute(Commands.FILE_ADD_TO_WORKING_SET, {fullPath: fullPath});
                waitsForDone(promise, "Open into working set");
            });
        }
        function openAnotherEditor(fullpath) {
            runs(function () {
                // Open another document and bring it to the front
                waitsForDone(FileViewController.openAndSelectDocument(fullpath, FileViewController.PROJECT_MANAGER),
                             "FILE_OPEN on file timeout", 1000);
            });
        }
        function openInlineEditor() {
            openEditor(HTML_FILE);
            
            runs(function () {
                // Open inline editor onto test.css's ".testClass" rule
                var promise = SpecRunnerUtils.toggleQuickEditAtOffset(EditorManager.getCurrentFullEditor(), {line: 8, ch: 11});
                waitsForDone(promise, "Open inline editor");
            });
        }
        function toggleOption(commandID, text) {
            runs(function () {
                var promise = CommandManager.execute(commandID);
                waitsForDone(promise, text);
            });
        }

        
        describe("Toggle Word Wrap", function () {
            it("should wrap long lines in main editor by default", function () {
                openEditor(HTML_FILE);
                
                runs(function () {
                    // Use two cursor positions to detect line wrapping. First position at 
                    // the beginning of a long line and the second position to be
                    // somewhere on the long line that will be part of an extra line 
                    // created by word-wrap and get its bottom coordinate.
                    checkLineWrapping({line: 8, ch: 0}, {line: 8, ch: 210}, true);
                });
            });
    
            it("should also wrap long lines in inline editor by default", function () {
                var inlineEditor;
                
                openInlineEditor();
                
                runs(function () {
                    inlineEditor = EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editors[0];
                    expect(inlineEditor).toBeTruthy();
    
                    checkLineWrapping({line: 0, ch: 0}, {line: 0, ch: 160}, true, inlineEditor);
                });
            });
            
            it("should NOT wrap the long lines after turning off word-wrap", function () {
                // Turn off word-wrap
                toggleOption(Commands.TOGGLE_WORD_WRAP, "Toggle word-wrap");
                
                openEditor(CSS_FILE);
                
                runs(function () {
                    checkLineWrapping({line: 0, ch: 1}, {line: 0, ch: 180}, false);
                });
            });
    
            it("should NOT wrap the long lines in another document when word-wrap off", function () {
                openEditor(CSS_FILE);
    
                // Turn off word-wrap
                toggleOption(Commands.TOGGLE_WORD_WRAP, "Toggle word-wrap");
                
                openAnotherEditor(HTML_FILE);
                
                runs(function () {
                    checkLineWrapping({line: 8, ch: 0}, {line: 8, ch: 210}, false);
                });
            });
        });
        
        
        describe("Toggle Active Line", function () {
            it("should show active line in main editor by default", function () {
                var editor, lineInfo;
                
                openEditor(HTML_FILE);
                
                runs(function () {
                    editor = EditorManager.getCurrentFullEditor();
                    expect(editor).toBeTruthy();
                    
                    editor.setCursorPos({line: 5, ch: 0});
                    lineInfo = editor._codeMirror.lineInfo(5);
                    expect(lineInfo.wrapClass).toBe("CodeMirror-activeline");
                });
            });
    
            it("should also show active line in inline editor by default", function () {
                var inlineEditor, lineInfo;
                
                openInlineEditor();
                
                runs(function () {
                    inlineEditor = EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editors[0];
                    expect(inlineEditor).toBeTruthy();
    
                    lineInfo = inlineEditor._codeMirror.lineInfo(0);
                    expect(lineInfo.wrapClass).toBe("CodeMirror-activeline");
                });
            });
            
            it("should NOT style active line after turning it off", function () {
                var editor, lineInfo;
                
                // Turn off show active line
                toggleOption(Commands.TOGGLE_ACTIVE_LINE, "Toggle active line");
                
                openEditor(CSS_FILE);
    
                runs(function () {
                    editor = EditorManager.getCurrentFullEditor();
                    expect(editor).toBeTruthy();
                    
                    lineInfo = editor._codeMirror.lineInfo(0);
                    expect(lineInfo.wrapClass).toBeUndefined();
                });
            });
    
            it("should NOT style the active line when opening another document with show active line off", function () {
                var editor, lineInfo;
                
                openEditor(CSS_FILE);
                
                // Turn off show active line
                toggleOption(Commands.TOGGLE_ACTIVE_LINE, "Toggle active line");
                
                openAnotherEditor(HTML_FILE);
                
                runs(function () {
                    editor = EditorManager.getCurrentFullEditor();
                    expect(editor).toBeTruthy();
                    
                    editor.setCursorPos({line: 3, ch: 5});
                    lineInfo = editor._codeMirror.lineInfo(3);
                    expect(lineInfo.wrapClass).toBeUndefined();
                });
            });
        });
        
        
        describe("Toggle Line Numbers", function () {
            it("should show line numbers in main editor by default", function () {
                var editor, gutterElement;
                
                openEditor(HTML_FILE);
                
                runs(function () {
                    editor = EditorManager.getCurrentFullEditor();
                    expect(editor).toBeTruthy();
    
                    gutterElement = editor._codeMirror.getGutterElement();
                    expect(gutterElement.style.display).toBe("");
                });
            });
            
            it("should also show line numbers in inline editor by default", function () {
                var inlineEditor, gutterElement;
                
                openInlineEditor();
                
                runs(function () {
                    inlineEditor = EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editors[0];
                    expect(inlineEditor).toBeTruthy();
    
                    gutterElement = inlineEditor._codeMirror.getGutterElement();
                    expect(gutterElement.style.display).toBe("");
                });
            });
            
            it("should NOT show line numbers after turning it off", function () {
                var editor, gutterElement;
                
                // Turn off show line numbers
                toggleOption(Commands.TOGGLE_LINE_NUMBERS, "Toggle line numbers");
                
                openEditor(CSS_FILE);
                
                runs(function () {
                    editor = EditorManager.getCurrentFullEditor();
                    expect(editor).toBeTruthy();
    
                    gutterElement = editor._codeMirror.getGutterElement();
                    expect(gutterElement.style.display).toBe("none");
                });
            });
            
            it("should NOT show line numbers when opening another document with show line numbers off", function () {
                var editor, gutterElement;
                
                openEditor(CSS_FILE);
                
                // Turn off show line numbers
                toggleOption(Commands.TOGGLE_LINE_NUMBERS, "Toggle line numbers");
                
                openAnotherEditor(HTML_FILE);
                
                runs(function () {
                    editor = EditorManager.getCurrentFullEditor();
                    expect(editor).toBeTruthy();
    
                    gutterElement = editor._codeMirror.getGutterElement();
                    expect(gutterElement.style.display).toBe("none");
                });
            });
        });
    });
});
