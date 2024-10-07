
"use strict";


class SharedData {
    static videoBlob;
    static DataSource;
}

const errorManager = new ErrorManager();
const basicInitializer = new BasicInitializer();

const cTracker = new ConceptTracker('result2', 
            "Following topics/sections will be explained:", 
            { color: 'red', font: 'Courier', bold: true });

const previewAreaControl = new PreviewAreaControl('loadingSpinner');
const cameraSupport = new CameraSupport(previewAreaControl);



const geoInfo = new GeolocationInfo();
geoInfo.getFormattedInfo().then(info => errorManager.log(1013, info));

const reportToDeveloper = new ReportToDeveloper();

const sendRecvManager = new SendReceiveManager(
    'fileInput',
    'sendButton',
    'result1',
    'result2',
    'loadingSpinner',
    'previewArea',
    'pdfCanvas'
);
