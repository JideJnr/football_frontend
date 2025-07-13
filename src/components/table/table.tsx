import React from "react";


interface TableProps {
  title?: string;
  filter?: any;
  columns?: Column[];
  data?: any[];
  onClick?: (row: any) => void;
  loading?: boolean;
  children?: any;
  text?: string;
}

export interface Column {
  accessor: string;
  Header: string;
  Cell?: (props: { value: any; row: any }) => JSX.Element | string;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  onClick,
  loading,
  text,
  children,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil((data?.length || 0) / 5);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatedData = data?.slice((currentPage - 1) * 5, currentPage * 5);

  const handleFirstPage = () => setCurrentPage(1);

  const handleLastPage = () => setCurrentPage(totalPages);

  return (
    <table className="min-w-full flex flex-col w-full divide-y divide-gray-200 overflow-x-auto bg-gray-50 rounded-md">
      {children && <div>{children}</div>}
      {data !== null && !loading && data !== undefined && (
        <thead className=" ">
          <tr className="grid grid-flow-col w-full p-2">
            {columns &&
              columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className="   p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.Header}
                </th>
              ))}
          </tr>
        </thead>
      )}
      <tbody className="dark:bg-[#1A1C1E] bg-white divide-y divide-gray-200 flex flex-col w-full min-w-full h-full ">
        {loading ? (
          <div className="h-full p-10 align-center w-fit mx-auto flex">
            <span className="loading mr-5">
              <i className="ri-refresh-line text-[1rem] animate-spin"></i>
            </span>
            <span>Fetching Data ...</span>
          </div>
        ) : (
          <>
            {paginatedData && paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-default border text-center cursor-pointer hover:bg-gray-100 py-2 grid grid-flow-col"
                  onClick={() => onClick && onClick(row)}
                >
                  {columns &&
                    columns.map((column, colIndex) => (
                      <td key={colIndex} className=" p-2  text-left ">
                        {column.Cell
                          ? column.Cell({
                              value: row[column.accessor],
                              row,
                            })
                          : row[column.accessor] !== null &&
                              row[column.accessor] !== undefined
                            ? row[column.accessor]
                            : "-"}
                      </td>
                    ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={1000} className="text-center py-4 w-full flex ">
              
                </td>
              </tr>
            )}
          </>
        )}
      </tbody>
      {data && data?.length > 5 && !loading && (
        <div className="flex w-full min-w-full items-center px-2 py-4 justify-between ">
          <div className="ml-2 mb-2 sm:mb-0">
            Page{" "}
            <strong>
              {currentPage} of {totalPages}
            </strong>
          </div>
          <div className=" float-right my-1 sm:my-0 flex">
            <button
              className="btn-outline-light tablebutton me-2 mb-2 sm:mb-0"
              onClick={handleFirstPage}
              disabled={currentPage === 1}
            >
              {" << "}
            </button>

            <button
              className="btn-outline-light tablebutton me-2 mb-2 sm:mb-0 sm:inline block"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              {" Previous "}
            </button>

            <button
              className="btn-outline-light tablebutton sm:inline block me-2 mb-2 sm:mb-0"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              {" Next "}
            </button>
            <button
              className="btn-outline-light tablebutton me-2 mb-2 sm:mb-0"
              onClick={handleLastPage}
              disabled={currentPage === totalPages}
            >
              {" >> "}
            </button>
          </div>
        </div>
      )}
    </table>
  );
};

export default Table;
