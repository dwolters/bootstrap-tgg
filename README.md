# Bootstraping Triple Graph Grammars (TGGs)
This project introduces a simple language that reduces the effort of writing TGGs for bidirectional model transformation.
The mapping language requires metamodels to be specified in eMSL and generates an eMSL TGG. Using [eMoflon::Neo](https://github.com/eMoflon/emoflon-neo), this TGG can be used for model transformation.

## Examples
Several [examples](public/examples/) illustrate the use of the mapping language. 

## Usage
The project can be used in two different ways. We provide an [online editor](https://dwolt.de/tgg/) for metamodels and mappings, which can generate a TGG based on the specified mapping.
Examples can be selected directly from a dropdown menu in the online editor.

Alternatively, the project can be used locally. Make sure to have TypeScript installed globally and run the following commands:

```sh
git clone https://github.com/dwolters/bootstrap-tgg.git
npm install
npm run build
```

Edit the [`config/default.json`](config/default.json) and specify the `sourceFolder` and `targetFolder`. Within the `sourceFolder,` there must be an `index.json` file specifying the mappings alongside the relevant metamodels and an output file for the generated TGG. An example of an `index.json` file is given in the [examples folder](public/examples/index.json).

Run the following command to generate TGGs for all mappings in the `index.json` file in the `sourceFolder`. 

```sh
npm start
```

The `targetFolder` could be set to an Eclipse project folder that uses [eMoflon::Neo](https://github.com/eMoflon/emoflon-neo) to generate Java code for the generated TGG.

