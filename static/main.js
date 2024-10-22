
"use strict";


class SharedData {
    static videoBlob;
    static DataSource;
}

const cTracker = new ConceptTracker('result2', 
            "Let's learn following topics/sections:", 
            { color: 'black', font: 'Courier', bold: true });

const errorManager = new ErrorManager();
const basicInitializer = new BasicInitializer();
const detailAreaManager = new DetailAreaManager('result1');

const mouseControl = new MouseControl('previewArea');

const previewAreaControl = new PreviewAreaControl('loadingSpinner');
const cameraSupport = new CameraSupport(previewAreaControl);

const containerMaximizeManager = new ContainerMaximizeManager();

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
