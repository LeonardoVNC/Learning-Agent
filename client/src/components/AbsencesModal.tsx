import { Modal, Table, Empty } from "antd";
import type { StudentInfo } from "../interfaces/studentInterface";

interface Absence {
  id: string;
  date: string;
}

interface AbsencesModalProps {
  open: boolean;
  onClose: () => void;
  student?: StudentInfo;
  absences?: Absence[];
  loading?: boolean;
}

function AbsencesModal({
  open,
  onClose,
  student,
  absences = [],
  loading = false,
}: AbsencesModalProps) {
  const columns = [
    {
      title: "Fechas de ausencia",
      dataIndex: "date",
      key: "date",
    }
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      title={`Ausencias de ${
        student ? student.name + " " + student.lastname : ""
      }`}
      footer={null}
      width={600}
    >
      {absences.length > 0 ? (
        <Table
          columns={columns}
          dataSource={absences}
          rowKey={(r) => r.id}
          loading={loading}
          pagination={false}
        />
      ) : (
        <Empty description="No hay ausencias registradas" />
      )}
    </Modal>
  );
}

export default AbsencesModal;
