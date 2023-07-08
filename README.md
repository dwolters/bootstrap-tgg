# Bootstraping Triple Graph Grammars (TGGs)
This project introduces a simple language that reduces the effort of writing TGGs for bidirectional model transformation.

## Examples
Several [examples](public/examples/) are provided illustrating the use of the mapping language. 

## Usage
The project can be used in two different ways. We provide an [online editor](https://dwolt.de/tgg/) for metamodels and mappings, which can generated a TGG based on the specified mapping.
You can directly select example mappings from a dropdown menu in the online editor.

Alternatively, the project can be used locally. Make sure to have TypeScript install globally and the run the following commands:

```sh
git clone https://github.com/dwolters/bootstrap-tgg.git
npm install
npm run build
```

Edit the `config/default.json` and specify the `sourceFolder` and `targetFolder`. Within the `sourceFolder` there has to be a `index.json` file specifying the mappings that shall be generated alongs the relevant metamodels.

Run the following command to generate TGGs for all mappings listed in the `index.json` file in the `sourceFolder` 
```sh
npm start
```

The `targetFolder` could be set to an Eclipse project folder that uses [eMoflon::Neo](https://github.com/eMoflon/emoflon-neo) to generate Java code for the generated TGG.

