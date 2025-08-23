"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Simple test file to check if basic setup compiles
var app_1 = __importDefault(require("./src/app"));
console.log('TypeScript compilation test passed!');
console.log('App class imported successfully:', app_1.default.name);
