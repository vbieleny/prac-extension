export default interface TestResult {
    testName: string;
    algorithm: string;
    parameters: string;
    pageFaults: string | number;
    overhead: string | number;
}