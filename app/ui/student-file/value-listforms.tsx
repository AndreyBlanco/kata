import { ValoracionIntegral } from '@/app/ui/student-file/value-lists';

export function ContextoAula() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Contexto de Aula
            {listForm?.map((element) => {
                return ( element.area=="contexto" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2" />
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2" />
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Grafia() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Grafía y Motricidad
            {listForm?.map((element) => {
                return ( element.area=="grafia" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Motricidad() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Motricidad Corporal-Global
            {listForm?.map((element) => {
                return ( element.area=="motricidad" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Visual() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Percepción Visual
            {listForm?.map((element) => {
                return ( element.area=="visual" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Auditiva() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Percepción Auditiva
            {listForm?.map((element) => {
                return ( element.area=="auditiva" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Espacio() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Interiorización del Espacio
            {listForm?.map((element) => {
                return ( element.area=="espacio" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Tiempo() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Interiorización del Tiempo
            {listForm?.map((element) => {
                return ( element.area=="tiempo" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Madurez() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Madurez Emocional
            {listForm?.map((element) => {
                return ( element.area=="madurez" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Lectoescritura() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Dificultades Epecíficas del Aprendizaje de la Lectura y Escritura
            {listForm?.map((element) => {
                return ( element.area=="lectoescritura" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Ortograficas() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Dificultades Ortográficas
            {listForm?.map((element) => {
                return ( element.area=="ortograficas" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export function Matematicas() {
    const listForm = ValoracionIntegral();

    return (
        <div className="border-y-2 py-2 ">
            Dificultades Específicas del Aprendizaje de las Matemáticas
            {listForm?.map((element) => {
                return ( element.area=="matematicas" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                            </div>
                            <div className="flex items-center">
                                <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                            </div>
                            </div>
                        </div>
                    </div>
                )})
            }      
        </div>
    )
}

export async function ContextoAulaUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Contexto de Aula
            {listForm?.map((element) => { 
                return ( element.area=="contexto" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function GrafiaUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Grafía y Motricidad
            {listForm?.map((element) => { 
                return ( element.area=="grafia" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function MotricidadUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Motricidad Corporal-Global
            {listForm?.map((element) => { 
                return ( element.area=="motricidad" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function VisualUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Percepción Visual
            {listForm?.map((element) => { 
                return ( element.area=="visual" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function AuditivaUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Percepción Auditiva
            {listForm?.map((element) => { 
                return ( element.area=="auditiva" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function EspacioUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Interiorización del Espacio
            {listForm?.map((element) => { 
                return ( element.area=="espacio" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function TiempoUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Interiorización del Tiempo
            {listForm?.map((element) => { 
                return ( element.area=="tiempo" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function MadurezUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Madurez Emocional
            {listForm?.map((element) => { 
                return ( element.area=="madurez" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function LectoescrituraUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Dificultades Específicas del Aprendizaje de la Lectura y Escritura
            {listForm?.map((element) => { 
                return ( element.area=="lectoescritura" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function OrtograficasUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Dificultades Ortográficas
            {listForm?.map((element) => { 
                return ( element.area=="ortograficas" &&
                    <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
            )})}
        </div>            
    )
}

export async function MatematicasUpdate(list) {
    const listForm = Object.values(list);
    return (
        <div className="border-y-2 py-2 ">
            Dificultades Específicas del Aprendizaje de las Matemáticas
            {listForm?.map((element) => { 
                return ( element.area=="matematicas" && < OptionsUpdate {...element} />
            )})}
        </div>            
    ) 
}

function OptionsUpdate(element) {
    return (
        <div className="flex">
                        <legend className="block self-center text-sm font-medium">
                            {element.texto}
                        </legend>
                        <div className="px-[14px] py-1">
                            {element.value == "si" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == "no" && <div className="flex gap-4">
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  defaultChecked className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                            {element.value == null && <div className="flex gap-4">
                                <div className="text-red-500">→</div>
                                <div className="flex items-center">
                                    <input id="si" name={element.name} type="radio" value="si" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="si" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600">SI</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="no" name={element.name} type="radio" value="no"  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                    <label htmlFor="no" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black">NO</label>
                                </div>
                            </div>}
                        </div>
                    </div>
    )
}